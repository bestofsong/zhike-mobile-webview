import React from 'react';
import { Platform, WebView } from 'react-native';
import PropTypes from 'prop-types';
import withDeepLink from './withDeepLink';
import withJsBridge from './withJsBridge';
import withQuery from './withQuery';
import withNavigate from './withNavigate';

class WebViewWithRef extends React.Component {
  static propTypes = {
    getWebView: PropTypes.string.isRequired,
    query: PropTypes.shape({
      token: PropTypes.string,
      userId: PropTypes.oneOfType(PropTypes.string, PropTypes.number),
      appName: PropTypes.string.isRequired,
      appVersion: PropTypes.string.isRequired,
      appType: PropTypes.string,
    }),
  };

  static defaultProps = {
    query: {
      token: '',
      userId: '',
      appType: Platform.select({ ios: 'iOS', android: 'Android' }),
    },
  };

  render() {
    return (
      <WebView
        {...this.props}
        ref={ref => this.props.getWebView(ref)}
      />
    );
  }
}

/* eslint-disable */
const copyProps = WrappedWebView => class extends React.Component {
  render() {
    const { navigation } = this.props;
    const { dispatch, state } = navigation || {};
    const { params } = state || {};
    const copiedProps = dispatch && params ? params : {};
    return (
      <WrappedWebView
        {...this.props}
        {...copiedProps}
      />
    );
  }
};
/* eslint-enable */

const baseHocs = [copyProps, withJsBridge, withQuery, withDeepLink, withNavigate];

export const withExtra = (...hocs) => {
  return baseHocs.concat(hocs).reduceRight((res, it) => it(res), WebViewWithRef);
};

export default withExtra();
