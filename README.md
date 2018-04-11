# Test TestViroAR

A sample app to test the ViroAR component.

To create this project I did the following steps.

## Create App, Eject and Test on Devices

```
npx create-react-native-app TestViroAR
yarn run eject
```

I called the app `TestViroAR`.  At this point I do an `rm -rf node_modules && npm install --no-bin-links && rm yarn.lock` and switch to using `npm` over `yarn`.

### Android

Opened the file `./android/app/build.gradle` in **Android Studio 3.1**.  Select _Don't remind me again for this project_ when asked to convert.

If you only have SDK's newer than 23 installed, edit `./android/app/build.gradle`:

```
android {
...
    defaultConfig {
...
        minSdkVersion 23
        targetSdkVersion 25
```

Per [ViroAR: Integrating to Existing Projects](https://docs.viromedia.com/docs/integrating-existing-projects-android).

Run `adb reverse tcp:8081 tcp:8081 && yarn start` in terminal.  Run the project in **Android Studio** on a real Android device and check all is well.  _Sometimes takes a couple of tries!_

### iOS

NOTE: React Native is in _constant_ flux at the moment and the stability of specific builds is horrible.  In particular the use of CocoaPods is not specifically support and the `use_frameworks!` is constantly broken, requiring numerous patches to fix. These instructions are specifically for `react-native@0.51.1`.

Patch the `packages.json` file with:

```
{
  "scripts": {
...
    "postinstall": "sed -i '' 's/#import <RCTAnimation\\/RCTValueAnimatedNode.h>/#import \"RCTValueAnimatedNode.h\"/' ./node_modules/react-native/Libraries/NativeAnimation/RCTNativeAnimatedNodesManager.h; sed -i '' 's/#import <fishhook\\/fishhook.h>/#import \"fishhook.h\"/' ./node_modules/react-native/Libraries/WebSocket/RCTReconnectingWebSocket.m"
...
```

Then `cd ./ios && npm install react-native@0.51.1`.

Open the file `./ios/TestViroAR.xcodeproj` in Xcode.  Under *Project Targets TestViroAR* select a *Signing Team*.  Delete the `Tests` and `tvOS` targets. Build and run the project on an actual device.

To convert the project to **CocoPods**, do the following.

Delete the `TestViroARTests` folder & move to trash.  Delete the `Libraries` and `Frameworks` folders and select _Remove Reference_.

Copy in this `Podfile`:

```
platform :ios, '9.3'

target 'TestViroAR' do
  use_frameworks!

  # Your 'node_modules' directory is probably in the root of your project,
  # but if not, adjust the `:path` accordingly
  pod 'React', :path => '../node_modules/react-native', :subspecs => [
    'Core',
    'CxxBridge', # Include this for RN >= 0.47
    'DevSupport', # Include this to enable In-App Devmenu if RN >= 0.43
    'RCTText',
    'RCTNetwork',
    'RCTWebSocket', # needed for debugging
    'RCTAnimation',
    'RCTGeolocation',
    'RCTImage',
  ]
  # Explicitly include Yoga if you are using RN >= 0.42.0
  pod 'yoga', :path => '../node_modules/react-native/ReactCommon/yoga'

  # Third party deps podspec link
  pod 'DoubleConversion', :podspec => '../node_modules/react-native/third-party-podspecs/DoubleConversion.podspec'
  pod 'GLog', :podspec => '../node_modules/react-native/third-party-podspecs/GLog.podspec'
  pod 'Folly', :podspec => '../node_modules/react-native/third-party-podspecs/Folly.podspec'
end

pre_install do |installer|
	# workaround for https://github.com/CocoaPods/CocoaPods/issues/3289
  Pod::Installer::Xcode::TargetValidator.send(:define_method, :verify_no_static_framework_transitive_dependencies) {}
end

post_install do |installer|
  installer.pods_project.targets.each do |target|
    if target.name == 'yoga'
      target.build_configurations.each do |config|
          config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
          config.build_settings['GCC_WARN_64_TO_32_BIT_CONVERSION'] = 'NO'
      end
    end
  end
end
```

Run `pod install`.  Open the `.xcworkspace` file in Xcode.

Say a prayer. Build. Run on a device to test; the first run can take a bit longer.

## Adding ViroAR

Updated the `App.js` file per the `master` branch.  Add the file `keys.js` containing an `export const viroAPIKey="..."`.

### iOS

Add to `Podfile`:

```
target 'TestViroAR' do
  ...
  pod 'ViroReact', :path => '../node_modules/react-viro/ios/'
  pod 'ViroKit', :path => '../node_modules/react-viro/ios/dist/ViroRenderer/'
```

Run `cd ./ios && pod install`.

Open the project in Xcode:

- Change the *iOS Deployment Target* to `9.3`.
- Turn off bitcode
- Add _Privacy - Camera Usage Description_ to the `info.plist`

Run and you should get a camera view with a floating box.

### Android

Add to `app/build.gradle`:

```
android {
    ...
    defaultConfig {
...
        multiDexEnabled true
    }
...
    buildTypes {
        productFlavors {
            gvr {
                resValue 'string', 'app_name', 'TestViroAR'
                buildConfigField 'String', 'VR_PLATFORM', '\"GVR\"'
            }
            ovr {
                resValue 'string', 'app_name', 'TestViroAR-OVR'
                applicationIdSuffix '.ovr'
                buildConfigField 'String', 'VR_PLATFORM', '\"OVR_MOBILE\"'
            }
        ...
        }
        ...
    }
    ...
}
...
dependencies {
    ...
    compile "com.android.support:appcompat-v7:25.0.0"
    ...
    compile project(':gvr_common')
    compile project(':arcore_client')
    compile project(path: ':react_viro')
    compile project(path: ':viro_renderer')
    compile 'com.google.android.exoplayer:exoplayer:r2.2.0'
    compile 'com.google.protobuf.nano:protobuf-javanano:3.0.0-alpha-7'
    compile 'com.amazonaws:aws-android-sdk-core:2.2.+'
    compile 'com.amazonaws:aws-android-sdk-ddb:2.2.+'
    compile 'com.amazonaws:aws-android-sdk-ddb-mapper:2.2.+'
    compile 'com.amazonaws:aws-android-sdk-cognito:2.2.+'
    compile 'com.amazonaws:aws-android-sdk-cognitoidentityprovider:2.2.+'
}
```

Add to `./android/app/src/main/java/com/testviroar/MainApplication.java`:

```
import com.viromedia.bridge.ReactViroPackage;
...
public class MainApplication extends Application implements ReactApplication {
    ...
    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new ReactViroPackage(ReactViroPackage.ViroPlatform.valueOf(BuildConfig.VR_PLATFORM)),
          new MainReactPackage()
      );
    }
    ...
```

In the file `android/app/src/main/res/strings.xml`, e.g.:

```xml
<resources>
    <string name="app_name">TestViroAR</string>
</resources>
```

Remove the line starting `<string name="app_name"...`.

Run the project on a device and you should get a camera view with floating box as with iOS.
