import React from "react"
import { View } from "react-native"
import {
  ViroARSceneNavigator,
  ViroARScene,
  ViroARPlane,
  ViroAmbientLight,
  ViroDirectionalLight,
  ViroMaterials,
  Viro3DObject,
  ViroSpotLight,
  ViroNode,
  ViroSurface,
} from "react-viro"
import autobind from "autobind-decorator"
import { viroAPIKey } from "./keys"

const distance = (vectorOne, vectorTwo) => {
  var distance = Math.sqrt(
    (vectorTwo[0] - vectorOne[0]) * (vectorTwo[0] - vectorOne[0]) +
      (vectorTwo[1] - vectorOne[1]) * (vectorTwo[1] - vectorOne[1]) +
      (vectorTwo[2] - vectorOne[2]) * (vectorTwo[2] - vectorOne[2])
  )
  return distance
}

class InitialARScene extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [0.2, 0.2, 0.2],
      shouldBillboard: true,
    }
  }

  @autobind
  handleLoadEnded() {
    this.arScene
      .getCameraOrientationAsync()
      .then((orientation) => {
        return this.refs.performARHitTestWithRay(orientation.forward)
      })
      .then((results) => {
        // Default position is just 1.5 meters in front of the user.
        let newPosition = [forward[0] * 1.5, forward[1] * 1.5, forward[2] * 1.5]
        let hitResultPosition = undefined

        // Filter the hit test results based on the position.
        if (results.length > 0) {
          for (var i = 0; i < results.length; i++) {
            let result = results[i]
            if (result.type == "ExistingPlaneUsingExtent") {
              var distance = Math.sqrt(
                (result.transform.position[0] - position[0]) *
                  (result.transform.position[0] - position[0]) +
                  (result.transform.position[1] - position[1]) *
                    (result.transform.position[1] - position[1]) +
                  (result.transform.position[2] - position[2]) *
                    (result.transform.position[2] - position[2])
              )
              if (distance > 0.2 && distance < 10) {
                // If we found a plane greater than .2 and less than 10 meters away then choose it!
                hitResultPosition = result.transform.position
                break
              }
            } else if (result.type == "FeaturePoint" && !hitResultPosition) {
              // If we haven't found a plane and this feature point is within range, then we'll use it
              // as the initial display point.
              var distance = this._distance(position, result.transform.position)
              if (distance > 0.2 && distance < 10) {
                hitResultPosition = result.transform.position
              }
            }
          }
        }

        if (hitResultPosition) {
          newPosition = hitResultPosition
        }

        // Set the initial placement of the object using new position from the hit test.
        this.setState({
          position,
        })
        this.setTimeout(() => {
          this.updateInitialRotation()
        }, 200)
      })
  }

  @autobind
  updateInitialRotation() {
    this.arNodeRef.getTransformAsync().then((retDict) => {
      let rotation = retDict.rotation
      let absX = Math.abs(rotation[0])
      let absZ = Math.abs(rotation[2])

      let yRotation = rotation[1]

      // If the X and Z aren't 0, then adjust the y rotation.
      if (absX > 1 && absZ > 1) {
        yRotation = 180 - yRotation
      }

      this.setState({
        rotation: [0, yRotation, 0],
        shouldBillboard: false,
      })
    })
  }

  render() {
    return (
      <ViroARScene ref={(ref) => (this.arScene = ref)}>
        <ViroAmbientLight color="#ffffff" intensity={200} />
        <ViroNode
          transformBehaviors={this.state.shouldBillboard ? "billboardY" : []}
          visible={this.props.arSceneNavigator.viroAppProps.displayObject}
          position={this.state.objPosition}
          scale={this.state.scale}
          rotation={this.state.rotation}>
          <ViroSpotLight
            innerAngle={5}
            outerAngle={20}
            direction={[0, -1, 0]}
            position={[0, 15, 0]}
            color="#ffffff"
            castsShadow={true}
            shadowNearZ={0.1}
            shadowFarZ={6}
            shadowOpacity={0.9}
          />
          <Viro3DObject
            position={[0, 0.5, -1]}
            source={require("./res/question_obj.obj")}
            resources={[require("./res/question.mtl")]}
            type="OBJ"
          />
          <ViroSurface
            rotation={[-90, 0, 0]}
            position={[0, -0.001, 0]}
            width={2.5}
            height={2.5}
            arShadowReceiver={true}
            ignoreEventHandling={true}
          />
        </ViroNode>
      </ViroARScene>
    )
  }
}

export default class App extends React.Component {
  render() {
    return (
      <View style={{ flex: 1 }}>
        <ViroARSceneNavigator
          style={{ flex: 1 }}
          apiKey={viroAPIKey}
          initialScene={{ scene: InitialARScene }}
        />
      </View>
    )
  }
}
