/////////////////////////////////////////////////////////////////
// ForgeFader signal attenuation calculator Forge viewer extension
// By Jeremy Tammik, Autodesk Inc, 2017-03-28
/////////////////////////////////////////////////////////////////
import FaderCoreExtension from './Viewing.Extension.Fader.Core'
import ExtensionBase from 'Viewer.ExtensionBase'
import WidgetContainer from 'WidgetContainer'
import HotSpotCommand from 'HotSpot.Command'
import ViewerTooltip from 'Viewer.Tooltip'
import EventTool from 'Viewer.EventTool'
import 'rc-tooltip/assets/bootstrap.css'
import 'rc-slider/assets/index.css'
import Tooltip from 'rc-tooltip'
import Gradient from 'Gradient'
import Slider from 'rc-slider'
import Switch from 'Switch'
import React from 'react'

class FaderExtension extends ExtensionBase
{
  /////////////////////////////////////////////////////////////////
  // Class constructor
  /////////////////////////////////////////////////////////////////
  constructor (viewer, options) {

    super (viewer, options)

    this.onSelection = this.onSelection.bind(this)
  }

  /////////////////////////////////////////////////////////////////
  // Load callback
  /////////////////////////////////////////////////////////////////
  load () {

    this.react = this.options.react

    this.react.pushRenderExtension(this)

    this.viewer.addEventListener(
      Autodesk.Viewing.MODEL_ROOT_LOADED_EVENT, (e) => {

        this.options.loader.show(false)
      })

    this.viewer.loadExtension(FaderCoreExtension)

    this.hotSpotCommand = new HotSpotCommand (this.viewer, {
      animate: true
    })

    this.tooltip = new ViewerTooltip(this.viewer, {
      stroke: '#88FF88',
      fill: '#88FF88'
    })

    this.tooltip.setContent(`
      <div id="fader-tooltipId" class="fader-tooltip">
          Specify source ...
      </div>`, '#fader-tooltipId')

    this.eventTool = new EventTool(this.viewer)

    this.eventTool.on('mousemove', (event) => {

      const hitTest = this.viewer.clientToWorld(
        event.canvasX, event.canvasY, true)

      if (hitTest) {

        if (this.dynamic) {

          this.faderCore.computeAttenuationAt(
            hitTest, true)
        }

        this.tooltip.activate()

      } else {

        this.tooltip.deactivate()
      }
    })

    this.onEnableFader(true)

    console.log('Viewing.Extension.Fader loaded')

    return true
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  get className() {

    return 'fader'
  }

  /////////////////////////////////////////////////////////
  // Extension Id
  /////////////////////////////////////////////////////////
  static get ExtensionId () {

    return 'Viewing.Extension.Fader'
  }

  /////////////////////////////////////////////////////////
  // Unload callback
  /////////////////////////////////////////////////////////
  unload () {

    console.log('Viewing.Extension.Fader unloaded')

    this.onEnableFader (false)

    this.tooltip.deactivate()

    return true
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onStopResize () {

    this.react.setState({
      guid: this.guid()
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onResize () {

    this.react.setState({
      guid: this.guid()
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onEnableFader (checked) {

    if (checked) {

      this.viewer.addEventListener(
        Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT,
        this.onSelection)

      this.eventTool.activate()

      this.viewer.loadExtension(
        FaderCoreExtension)

      this.faderCore = this.viewer.getExtension(
        FaderCoreExtension)

      this.faderCore.on('attenuation.source',
        (data) => {

          this.hotSpotCommand.removeHotSpots()

          const hotSpot =
            this.hotSpotCommand.createHotSpot({
              worldPoint: data.point,
              strokeColor: "#88FF88",
              fillColor: "#228a01",
              dbId: data.dbId,
              occlusion: true,
              id: 1
            })

          hotSpot.setSelectable(false)

          this.selectedDbId = data.dbId
      })

      this.faderCore.on('attenuation.bounds',
        (bounds) => {

          this.react.setState({
            data: [
              {value: bounds.min},
              {value: bounds.max}
            ],
            guid: this.guid()
          })
      })

      this.react.setState({
        fader: true
      })

    } else {

      this.viewer.removeEventListener(
        Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT,
        this.onSelection)

      this.hotSpotCommand.removeHotSpots ()

      this.eventTool.deactivate()

      this.viewer.unloadExtension(
        FaderCoreExtension)

      this.react.setState({
        fader: false
      })
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onSelection (event) {

    if (event.selections.length) {

      const selection = event.selections[0]

      if (selection.dbIdArray[0] === this.selectedDbId) {

        this.viewer.clearSelection()
      }
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onShowRaycasting (checked) {

    this.faderCore.debugRaycastRays = checked
  }

  onUseRawValues(checked) {

    this.faderCore.texFilter = checked
  }

  onDynamicMode (checked) {

    this.dynamic = checked
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  async setDocking (docked) {

    const id = FaderExtension.ExtensionId

    if (docked) {

    await this.react.popRenderExtension(id)

      this.react.pushViewerPanel(this, {
        height: 615,
        width: 350
      })

    } else {

    await this.react.popViewerPanel(id)

      this.react.pushRenderExtension(this)
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderTitle (docked) {

    const spanClass = docked
      ? 'fa fa-chain-broken'
      : 'fa fa-chain'

    return (
      <div className="title">
        <label>
          Forge Fader
        </label>
        <div className="fader-controls">
          <button onClick={() => this.setDocking(docked)}
            title="Toggle docking mode">
            <span className={spanClass}/>
          </button>
        </div>
      </div>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onSlider1Changed (props) {

    const { value, dragging, offset } = props

    this.faderCore.attenuationPerMeterInAir = value

    return (
      <Tooltip
        prefixCls="rc-slider-tooltip"
        visible={dragging}
        overlay={value}
        placement="top">
        <Slider.Handle className="rc-slider-handle"
          offset={offset}/>
      </Tooltip>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onSlider2Changed (props) {

    const { value, dragging, offset } = props

    this.faderCore.attenuationPerWall = value

    return (
      <Tooltip
        prefixCls="rc-slider-tooltip"
        visible={dragging}
        overlay={value}
        placement="top">
        <Slider.Handle className="rc-slider-handle"
          offset={offset}/>
      </Tooltip>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onSlider3Changed (props) {

    const { value, dragging, offset } = props

    this.faderCore.gridDensity = value

    return (
      <Tooltip
        prefixCls="rc-slider-tooltip"
        visible={dragging}
        overlay={value}
        placement="top">
        <Slider.Handle className="rc-slider-handle"
          offset={offset}/>
      </Tooltip>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderLegend () {

    const { guid, data } = this.react.getState()

    return (
      <div>
        <div className="row">
          <div className="control-element">
            Signal Attenuation - Legend
          </div>
        </div>

        <div className="row" style={{
          width: "calc(100% - 43px)",
          height: "80px"
          }}>
          <Gradient colorScale={["#00FF00", "#FF0000"]}
            className="control-element"
            guid={guid}
            data={data}
            ticks={10}/>
        </div>
      </div>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  renderContent () {

    const { fader, guid } = this.react.getState()

    return (
      <div className="settings">

        <div className="row">
          <div className="control-element">
            Enable Fader
          </div>
        </div>
        <div className="row" style={{marginBottom: '18px'}}>
          <Switch className="control-element"
            onChange={(checked) => this.onEnableFader(checked)}
            checked={true}/>
        </div>

        {
          fader &&

          <div>
            <div className="row">
              <div className="control-element">
                Show Raycasting
              </div>
            </div>

            <div className="row" style={{marginBottom: '18px'}}>
              <Switch className="control-element"
                onChange={(checked) => this.onShowRaycasting(checked)}
                checked={false}/>
            </div>

            <div className="row">
              <div className="control-element">
                 Raw values / Smooth values
              </div>
            </div>

            <div className="row" style={{marginBottom: '18px'}}>
              <Switch className="control-element"
                onChange={(checked) => this.onUseRawValues(checked)}
                checked={true}/>
            </div>

            <div className="row">
              <div className="control-element">
                Enable Dynamic Mode
              </div>
            </div>

            <div className="row" style={{marginBottom: '18px'}}>
              <Switch className="control-element"
                onChange={(checked) => this.onDynamicMode(checked)}
                checked={false}/>
            </div>

            <div className="row">
              <div className="control-element">
                Signal Attenuation per Metre in Air
              </div>
            </div>
            <div className="row" style={{marginBottom: '18px'}}>
              <Slider className="control-element"
                handle={(props) => this.onSlider1Changed(props)}
                defaultValue={this.faderCore.attenuationPerMeterInAir}
                step={0.01}
                min={0.01}
                max={10.0}/>
            </div>

            <div className="row">
              <div className="control-element">
                Signal Attenuation per Wall
              </div>
            </div>
            <div className="row" style={{marginBottom: '18px'}}>
              <Slider className="control-element"
                handle={(props) => this.onSlider2Changed(props)}
                defaultValue={this.faderCore.attenuationPerWall}
                step={0.01}
                min={0.01}
                max={20.0}/>
            </div>

            <div className="row">
              <div className="control-element">
                Grid Density (Units per UV)
              </div>
            </div>
            <div className="row" style={{marginBottom: '18px'}}>
              <Slider className="control-element"
                handle={(props) => this.onSlider3Changed(props)}
                defaultValue={this.faderCore.gridDensity}
                step={1}
                min={4}
                max={20}/>
            </div>

            { guid && this.renderLegend() }

          </div>
        }

      </div>
    )
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  render (opts) {

    return (
      <WidgetContainer
        renderTitle={() => this.renderTitle(opts.docked)}
        showTitle={opts.showTitle}
        className={this.className}>

        { this.renderContent () }

      </WidgetContainer>
    )
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  FaderExtension.ExtensionId,
  FaderExtension)

module.exports = 'Viewing.Extension.Fader'
