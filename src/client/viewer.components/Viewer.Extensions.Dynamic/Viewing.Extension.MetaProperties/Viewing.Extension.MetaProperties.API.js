//////////////////////////////////////////////////////////
// ConfigManager API
//
///////////////////////////////////////////////////////////
import ClientAPI from 'ClientAPI'

export default class MetaAPI extends ClientAPI {

  /////////////////////////////////////////////////////////
  // Class constructor
  //
  /////////////////////////////////////////////////////////
  constructor (apiUrl) {

    super (apiUrl)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getModelMetaProperties () {

    const url = '/all'

    return this.ajax(url)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getNodeMetaProperties (dbId) {

    const url = `/${dbId}/properties`

    return this.ajax(url)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  getNodeMetaProperty (metaId) {

    const url = `/properties/${metaId}`

    return this.ajax(url)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  addNodeMetaProperty (metaProperty) {

    const payload = {
      metaProperty
    }

    const url = '/properties'

    return this.ajax({
      url: url,
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(payload)
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  updateNodeMetaProperty (metaProperty) {

    const payload = {
      metaProperty
    }

    const url = '/properties'

    return this.ajax({
      url: url,
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(payload)
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  deleteNodeMetaProperty (metaId) {

    const url = `/properties/${metaId}`

    return this.ajax({
      url: url,
      method: 'DELETE'
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  uploadResource (resourceId, file, opts = {}) {

    const url = `/resources/${resourceId}`

    const options = Object.assign({}, {
      tag: 'metaFile'
    }, opts)

    return super.upload (url, file, options)
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  deleteResource (resourceId) {

    const url = `/resources/${resourceId}`

    return this.ajax({
      url: url,
      method: 'DELETE'
    })
  }
}
