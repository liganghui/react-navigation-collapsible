/* global global */

import React, {Component} from 'react';
import { Animated, Platform, Dimensions, View } from 'react-native';
import { withOrientation } from '@react-navigation/native';
import hoistNonReactStatic from 'hoist-non-react-statics';

export const CollapsibleType = {
  regularHeader: 0,
  extraHeader: 1,
}

export const isOrientationLandscape = ({ width, height }) => width > height;

let androidStatusBarHeight = 0;
export const setExpoStatusBarHeight = height => {
  if(Platform.OS === 'android' && global.Expo)
    androidStatusBarHeight = height;
}

const IPHONE_XS_HEIGHT = 812; // iPhone X and XS
const IPHONE_XR_HEIGHT = 896; // iPhone XR and XS Max
const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');
export const IS_IPHONE_X =
  Platform.OS === 'ios' &&
  !Platform.isPad &&
  !Platform.isTVOS &&
  (WINDOW_HEIGHT === IPHONE_XS_HEIGHT ||
    WINDOW_WIDTH === IPHONE_XS_HEIGHT ||
    WINDOW_HEIGHT === IPHONE_XR_HEIGHT ||
    WINDOW_WIDTH === IPHONE_XR_HEIGHT);


const defaultHeaderHeight = Platform.select({ios: 44, android: 56, web: 50});
const safeBounceHeight = Platform.select({ios: 300, android: 100, web: 200});

const getStatusBarHeight = (isLandscape) => {
  if (Platform.OS === 'ios') {
    if(isLandscape) return 0;
    return IS_IPHONE_X ? 44 : 20;
  } else if (Platform.OS === 'android') return androidStatusBarHeight;
  else return 0;
}
const getNavigationHeight = (isLandscape, headerHeight) => {
  return headerHeight + getStatusBarHeight(isLandscape);
}

const createCollapsibleParams = (animatedY) => {
  return {
    animatedY,
    animatedDiffClampY: Animated.diffClamp(animatedY, 0, safeBounceHeight)
  }
}

const getTranslateY = (animatedDiffClampY, headerHeight, offset = 0) => (
  animatedDiffClampY && headerHeight && animatedDiffClampY.interpolate({
    inputRange: [safeBounceHeight, safeBounceHeight + headerHeight],
    outputRange: [offset, offset - headerHeight],
    extrapolate: 'clamp'
  }) 
) || 0;
const getTranslateProgress = (animatedDiffClampY, headerHeight) => (
  animatedDiffClampY && headerHeight && animatedDiffClampY.interpolate({
    inputRange: [safeBounceHeight, safeBounceHeight + headerHeight],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  }) 
) || 0;
const getOpacity = (animatedDiffClampY, headerHeight) => (
  animatedDiffClampY && headerHeight && animatedDiffClampY.interpolate({
    inputRange: [safeBounceHeight, safeBounceHeight + headerHeight],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  }) 
) || 0;






const CollapsibleExtraHeader = props => {
  const { children, style, navigation } = props;
  
  if(!navigation) return null;
  const { animatedDiffClampY } = navigation.state.params || {};

  const height = style.height || 0;
  const translateY = animatedDiffClampY ? getTranslateY(animatedDiffClampY, height) : 0;
  const opacity = animatedDiffClampY ? getOpacity(animatedDiffClampY, height) : 1;
  return (
    <Animated.View style={[style, {
      width: '100%', 
      position: 'absolute',
      transform: [{translateY}]}]}>
      <Animated.View style={{width: '100%', height: '100%', opacity}}>
        {children}
      </Animated.View>
    </Animated.View>
  )
}

class _CollapsibleHeaderBackView extends Component {
  state = {
    isShow: true
  }

  componentDidMount(){
    const { navigation } = this.props;
    this.subscribe_willFocus = navigation.addListener('willFocus', () => {
      this.setState({isShow: true});
    });
    this.subscribe_willBlur = navigation.addListener('willBlur', () => {
      this.setState({isShow: false});
    });
  }
  componentWillUnmount(){
    if(this.subscribe_willFocus){
      this.subscribe_willFocus.remove();
      this.subscribe_willFocus = null;
    }
    if(this.subscribe_willBlur){
      this.subscribe_willBlur.remove();
      this.subscribe_willBlur = null;
    }
  }

  render(){
    if(Platform.OS.match(/android|web/))
      return null;

    const { isLandscape, navigation, iOSCollapsedColor } = this.props;
    if(!this.state.isShow || !navigation || !navigation.state.params || !navigation.state.params.animatedDiffClampY || !navigation.state.params.headerHeight)
      return null;

    const { headerHeight, animatedDiffClampY } = navigation.state.params || {};
    const navigationHeight = getNavigationHeight(isLandscape, headerHeight);
    const translateY = getTranslateY(animatedDiffClampY, headerHeight)

    return (
      <Animated.View 
        style={{
          zIndex: 100,
          transform: [{translateY: translateY}], 
          backgroundColor: iOSCollapsedColor, 
          position: 'absolute', 
          width: '100%', 
          height: navigationHeight}}/>
    )
  }
}

const CollapsibleHeaderBackView = withOrientation(_CollapsibleHeaderBackView);

const collapsibleNavigationOptions = (configOptions, userOptions, navigation) => {
  userOptions = {
    ...configOptions,
    ...userOptions,
    headerStyle:{
      ...configOptions.headerStyle,
      ...userOptions.headerStyle
    }
  };

  const navigationParams = navigation.state.params;

  if(!navigationParams || !navigationParams.animatedDiffClampY ){
    // console.log('navigationParams is null');
    return userOptions;
  }

  const { collapsibleTranslateY, collapsibleTranslateOpacity } = navigationParams;
  const headerHeight = userOptions.headerStyle && userOptions.headerStyle.height 
    ? userOptions.headerStyle.height
    : defaultHeaderHeight;
  if(navigationParams.headerHeight !== headerHeight){
    const animatedDiffClampY = Animated.diffClamp(navigationParams.animatedY, 0, safeBounceHeight + headerHeight);
    navigation.setParams({
      headerHeight,
      animatedDiffClampY,
      collapsibleTranslateY: getTranslateY(animatedDiffClampY, headerHeight),
      collapsibleTranslateOpacity: getOpacity(animatedDiffClampY, headerHeight),
      collapsibleTranslateProgress: getTranslateProgress(animatedDiffClampY, headerHeight),
    });
  }

  const collapsibleOptions = {
    ...configOptions,
    ...userOptions,
    headerStyle: {
      ...configOptions.headerStyle,
      ...userOptions.headerStyle,
      transform: [{translateY: collapsibleTranslateY}],
      overflow: 'hidden',
      opacity: Platform.select({ios: collapsibleTranslateOpacity, android: global.Expo ? collapsibleTranslateOpacity : 1, web: 1}),
      height: headerHeight,
    },
    headerTransparent: true, 
  };

  return collapsibleOptions;
}

const getCollapsibleHeaderHeight = (navigationParams) => (navigationParams && navigationParams.headerHeight) || 0;

export const withCollapsible = (WrappedScreen, collapsibleParams = { type: CollapsibleType.regularHeader, iOSCollapsedColor: 'black' }) => {
  class _withCollapsible extends Component{
    constructor(props){
      super(props);

      this.animatedY = new Animated.Value(0);

      switch (collapsibleParams.type) {
        case CollapsibleType.regularHeader:
          this.props.navigation.setParams({
            ...createCollapsibleParams(this.animatedY),
          });
          break;
        case CollapsibleType.extraHeader: {
            const headerHeight = collapsibleParams.collapsibleBackgroundStyle && collapsibleParams.collapsibleBackgroundStyle.height || 0;
            const animatedDiffClampY = Animated.diffClamp(this.animatedY, 0, safeBounceHeight + headerHeight);
            this.props.navigation.setParams({
              animatedDiffClampY,
              collapsibleTranslateY: getTranslateY(animatedDiffClampY, headerHeight, headerHeight),
              collapsibleTranslateOpacity: getOpacity(animatedDiffClampY, headerHeight),
              collapsibleTranslateProgress: getTranslateProgress(animatedDiffClampY, headerHeight),
            });
          }
          break;
      }

      this.onScroll = Animated.event(
        [{nativeEvent: {contentOffset: {y: this.animatedY}}}],
        {useNativeDriver: Platform.select({ios: true, android: true, web: false})});
    }

    componentDidMount(){
      Dimensions.addEventListener('change', this.orientationListner);
    }
    componentWillUnmount(){
      Dimensions.removeEventListener('change', this.orientationListner);
      this.props.navigation.state.params = undefined;
    }
    orientationListner = ({window}) => {
      this.props.navigation.setParams({isLandscape: isOrientationLandscape(window)})
    }

    render(){
      const { navigation } = this.props;
      const { params = {} } = navigation.state;

      let paddingHeight = 0;

      switch (collapsibleParams.type) {
        case CollapsibleType.regularHeader: {
            const collapsibleHeaderHeight = getCollapsibleHeaderHeight(params);
            if (collapsibleHeaderHeight) {
              const isLandscape = isLandscape !== undefined ? isLandscape : isOrientationLandscape(Dimensions.get('window'));
              paddingHeight = collapsibleHeaderHeight + getStatusBarHeight(isLandscape);
            }
          }
          break;
        case CollapsibleType.extraHeader:
          paddingHeight = collapsibleParams.collapsibleBackgroundStyle.height;
          break;
      }

      const props = {
        ...this.props,
        collapsible:{
          paddingHeight,
          animatedY: this.animatedY,
          onScroll: this.onScroll,
          translateY: params.collapsibleTranslateY || new Animated.Value(paddingHeight),
          translateOpacity: params.collapsibleTranslateOpacity || new Animated.Value(1),
          translateProgress: params.collapsibleTranslateProgress || new Animated.Value(0),
        }
      }

      let collapsibleComponent = null;
      switch (collapsibleParams.type) {
        case CollapsibleType.regularHeader:
          collapsibleComponent = <CollapsibleHeaderBackView iOSCollapsedColor={collapsibleParams.iOSCollapsedColor} navigation={navigation} />;
          break;
        case CollapsibleType.extraHeader:
          collapsibleComponent = (
            <CollapsibleExtraHeader navigation={navigation} style={collapsibleParams.collapsibleBackgroundStyle}>
              <collapsibleParams.collapsibleComponent {...props}/>
            </CollapsibleExtraHeader>
          );
          break;
      }

      return (
        <View style={{flex: 1}}>
          <WrappedScreen {...props}/>
          {collapsibleComponent}
        </View>
      );
    }
  }

  const hoist = hoistNonReactStatic(_withCollapsible, WrappedScreen);

  switch (collapsibleParams.type) {
    case CollapsibleType.regularHeader: 
      hoist.navigationOptions = props => {
        const wrapScreenNavOptions = WrappedScreen.navigationOptions ? WrappedScreen.navigationOptions : {};
        const userOptions = typeof wrapScreenNavOptions === 'function' ? wrapScreenNavOptions(props) : wrapScreenNavOptions;
        
        const { navigationOptions, navigation } = props;
        return collapsibleNavigationOptions(navigationOptions, userOptions, navigation);
      }
      break;
    default:
      break;
  }

  return hoist;
}
