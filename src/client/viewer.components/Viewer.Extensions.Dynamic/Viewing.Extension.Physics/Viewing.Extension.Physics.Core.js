/////////////////////////////////////////////////////////
// Viewing.Extension.Physics.Core
// by Philippe Leefsma, July 2017
//
/////////////////////////////////////////////////////////
import MultiModelExtensionBase from 'Viewer.MultiModelExtensionBase'
import EventsEmitter from 'EventsEmitter'
import Toolkit from 'Viewer.Toolkit'
import Stopwatch from 'Stopwatch'
import _ from 'lodash'

class PhysicsCoreExtension extends MultiModelExtensionBase {

  /////////////////////////////////////////////////////////
  // Class constructor
  //
  /////////////////////////////////////////////////////////
  constructor (viewer, options) {

    super (viewer, options)

    this.update = this.update.bind(this)

    this.stopwatch = new Stopwatch()

    this.timeSkew = options.timeSkew || 1.0

    this.gravity = options.gravity || -9.8

    this.world = this.createWorld(this.gravity)
  }

  /////////////////////////////////////////////////////////
  // Extension Id
  //
  /////////////////////////////////////////////////////////
  static get ExtensionId() {

    return 'Viewing.Extension.Physics.Core'
  }

  /////////////////////////////////////////////////////////
  // Load callback
  //
  /////////////////////////////////////////////////////////
  load () {

    console.log('Viewing.Extension.Physics.Core loaded')

    return true
  }

  /////////////////////////////////////////////////////////
  // Unload callback
  //
  /////////////////////////////////////////////////////////
  unload () {

    console.log('Viewing.Extension.Physics.Core unloaded')

    this.runAnimation(false)

    super.unload ()

    return true
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async loadPhysicModel (model) {

    const initialState =
      await this.createInitialState(model)

    this.rigidBodies = initialState.map((state) => {

      const body = this.createRigidBody(state)

      this.setRigidBodyState(body, state)

      return body
    })

    this.rigidBodies.forEach((rigidBody) => {

      this.world.addRigidBody(rigidBody)
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getRigidBody (dbId) {

    return _.find(this.rigidBodies, (body) => {

      return dbId === body.initialState.dbId
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  createWorld (gravity) {

    const collisionConfiguration =
      new Ammo.btDefaultCollisionConfiguration

    const world = new Ammo.btDiscreteDynamicsWorld(
      new Ammo.btCollisionDispatcher(collisionConfiguration),
      new Ammo.btDbvtBroadphase,
      new Ammo.btSequentialImpulseConstraintSolver,
      collisionConfiguration)

    world.setGravity(
      new Ammo.btVector3(
        0, 0, gravity))

    return world
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  setGravity (gravity) {

    this.gravity = gravity

    this.world.setGravity(
      new Ammo.btVector3(
        0, 0, this.gravity))
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  setTimeSkew (timeSkew) {

    this.timeSkew = timeSkew
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  createCollisionShape(dbId, scale) {

    const hull = new Ammo.btConvexHullShape()

    const vertices = this.getComponentVertices(dbId)

    vertices.forEach((vertex) => {
      hull.addPoint(
        new Ammo.btVector3(
          vertex.x * scale.x,
          vertex.y * scale.y,
          vertex.z * scale.z))
    })

    return hull
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getComponentTransform (dbId) {

    const fragIds = Toolkit.getLeafFragIds(
      this.viewer.model, dbId)

    const renderProxy = this.viewer.impl.getRenderProxy(
      this.viewer.model, fragIds[0])

    const quaternion = new THREE.Quaternion()
    const position = new THREE.Vector3()
    const scale = new THREE.Vector3()

    const matrix = renderProxy.matrixWorld

    matrix.decompose(
      position,
      quaternion,
      scale)

    return {
      quaternion,
      position,
      scale
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getComponentVertices (dbId) {

    const vertexArray = []

    const fragIds = Toolkit.getLeafFragIds(
      this.viewer.model, dbId)

    fragIds.forEach((fragId) => {

      const renderProxy =
        this.viewer.impl.getRenderProxy(
          this.viewer.model, fragId)

      const geometry = renderProxy.geometry

      const attributes = geometry.attributes

      const positions = geometry.vb
        ? geometry.vb
        : attributes.position.array

      const indices = attributes.index.array || geometry.ib

      const stride = geometry.vb ? geometry.vbstride : 3

      const offsets = [{
        count: indices.length,
        index: 0,
        start: 0
      }]

      for (var oi = 0, ol = offsets.length; oi < ol; ++oi) {

        var start = offsets[oi].start
        var count = offsets[oi].count
        var index = offsets[oi].index

        for (var i = start, il = start + count; i < il; i += 3) {

          const a = index + indices[i]
          const b = index + indices[i + 1]
          const c = index + indices[i + 2]

          const vA = new THREE.Vector3()
          const vB = new THREE.Vector3()
          const vC = new THREE.Vector3()

          vA.fromArray(positions, a * stride)
          vB.fromArray(positions, b * stride)
          vC.fromArray(positions, c * stride)

          vertexArray.push(vA)
          vertexArray.push(vB)
          vertexArray.push(vC)
        }
      }
    })

    return vertexArray
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async createInitialState (model) {

    const parseArray = (str, factor, separator = ';') => {

      return str.split(separator).map((element) => {

        return parseFloat(element) * factor
      })
    }

    const dbIds = await Toolkit.getLeafNodes(model)

    const tasks = dbIds.map(async(dbId, idx) => {

      const vLinear = await Toolkit.getProperty (
        model, dbId, 'vInit', '0;0;0')

      const mass = (idx < dbIds.length - 1) ? 1.0 : 0

      const compTransform =
        this.getComponentTransform(dbId)

      const {position, quaternion, scale } =
        compTransform

      const fragIds = Toolkit.getLeafFragIds(
        this.viewer.model, dbId)

      return {
        vLinear: parseArray(vLinear.displayValue, 3.5),
        vAngular: [0,0,0],
        quaternion,
        position,
        fragIds,
        scale,
        dbId,
        mass
      }
    })

    return await Promise.all(tasks)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  createRigidBody (state) {

    const inertia = new Ammo.btVector3(0, 0, 0)

    const shape = this.createCollisionShape(
      state.dbId, state.scale)

    shape.calculateLocalInertia(
      state.mass, inertia)

    const transform = new Ammo.btTransform

    transform.setIdentity()

    const motionState =
      new Ammo.btDefaultMotionState(
        transform)

    const rbInfo =
      new Ammo.btRigidBodyConstructionInfo(
        state.mass,
        motionState,
        shape,
        inertia)

    const body = new Ammo.btRigidBody(rbInfo)

    body.grounded = (state.mass === 0.0)

    body.initialState = state

    body.dbId = state.dbId

    return body
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  setRigidBodyState (body, state) {

    const transform = new Ammo.btTransform

    transform.setIdentity()

    transform.setOrigin(
      new Ammo.btVector3(
        state.position.x,
        state.position.y,
        state.position.z))

    transform.setRotation(
      new Ammo.btQuaternion(
        state.quaternion.x,
        state.quaternion.y,
        state.quaternion.z,
        state.quaternion.w))

    const motionState =
      new Ammo.btDefaultMotionState(
        transform)

    body.setMotionState(motionState)

    body.setLinearVelocity(
      new Ammo.btVector3(
        state.vLinear[0],
        state.vLinear[1],
        state.vLinear[2]))

    body.setAngularVelocity(
      new Ammo.btVector3(
        state.vAngular[0],
        state.vAngular[1],
        state.vAngular[2]))

    return body
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  groundRigidBody (body, grounded) {

    const inertia = new Ammo.btVector3(0, 0, 0)

    if (grounded) {

      body.setMassProps (0.0, inertia)

      body.grounded = true

    } else {

      const mass = body.initialState.mass

      body.setMassProps (mass, inertia)

      body.grounded = (mass === 0)
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getVelocity (rigidBody) {

    const vAngular = rigidBody.getAngularVelocity()

    const vLinear = rigidBody.getLinearVelocity()

    return {
      angular: {
        x: vAngular.x(),
        y: vAngular.y(),
        z: vAngular.z()
      },
      linear: {
        x: vLinear.x(),
        y: vLinear.y(),
        z: vLinear.z()
      }
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  setVelocity (rigidBody, velocity) {

    rigidBody.setAngularVelocity(
      new Ammo.btVector3(
        velocity.angular.x,
        velocity.angular.y,
        velocity.angular.z))

    rigidBody.setLinearVelocity(
      new Ammo.btVector3(
        velocity.linear.x,
        velocity.linear.y,
        velocity.linear.z))
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  updateComponentTransform (rigidBody) {

    const transform = rigidBody.getCenterOfMassTransform()

    const rotation = transform.getRotation()

    const origin = transform.getOrigin()

    const position = new THREE.Vector3(
      origin.x(),
      origin.y(),
      origin.z())

    const offset = new THREE.Vector3(
      rigidBody.initialState.position.x,
      rigidBody.initialState.position.y,
      rigidBody.initialState.position.z)

    const fragIds = rigidBody.initialState.fragIds

    fragIds.forEach((fragId) => {

      const fragProxy =
        this.viewer.impl.getFragmentProxy(
          this.viewer.model, fragId)

      fragProxy.getAnimTransform()

      fragProxy.quaternion =
        new THREE.Quaternion(
          rotation.x(),
          rotation.y(),
          rotation.z(),
          rotation.w())

      offset.applyQuaternion(fragProxy.quaternion)

      fragProxy.position.x = position.x - offset.x
      fragProxy.position.y = position.y - offset.y
      fragProxy.position.z = position.z - offset.z

      fragProxy.updateAnimTransform()
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  runAnimation (run) {

    window.cancelAnimationFrame(this.animId)

    this.running = run

    if (run) {

      this.update()
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  update () {

    if (this.running) {

      const dt = this.stopwatch.getElapsedMs()

      const skew = this.timeSkew * 500

      this.world.stepSimulation(
        dt * Math.sqrt(skew),
        Math.sqrt(skew))

      this.rigidBodies.forEach((body) => {

        if (!body.grounded) {

          this.updateComponentTransform(
            body, body.initialState)
        }
      })

      this.options.fps.tick()

      this.viewer.impl.sceneUpdated(true)

      this.animId = window.requestAnimationFrame(
        this.update)
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async reset () {

    this.rigidBodies.forEach((body) => {

      if (!body.grounded) {

        this.setRigidBodyState(
          body, body.initialState)

        if (!this.running) {

          this.updateComponentTransform(
            body, body.initialState)
        }

        body.setActivationState(4)
      }
    })

    this.viewer.impl.sceneUpdated(true)
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  PhysicsCoreExtension.ExtensionId,
  PhysicsCoreExtension)

export default PhysicsCoreExtension.ExtensionId




