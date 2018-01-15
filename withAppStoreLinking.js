import React from 'react';
import { Linking } from 'react-native';
import URI from 'urijs';
import PropTypes from 'prop-types';

export default WrappedWebView => class extends React.Component {
  static propTypes = {
    callbackToWebpage: PropTypes.func.isRequired,
    onShouldStartLoadWithRequest: PropTypes.func,
  };

  static defaultProps = {
    onShouldStartLoadWithRequest: () => true,
  };

  onShouldStartLoadWithRequest(req) {
    const { callbackToWebpage, onShouldStartLoadWithRequest } = this.props;
    const { url } = req || {};
    if (!url) {
      return false;
    }

    const uri = URI(url);
    const host = uri.host();
    const path = uri.path();
    const idStr = /id\d+$/;

    if ((host === 'itunes.apple.com' && idStr.test(path)) || host === 'a.app.qq.com') {
      Linking.openURL(url);
      callbackToWebpage(url, { code: 0 });
      return false;
    }

    if (onShouldStartLoadWithRequest) {
      return onShouldStartLoadWithRequest(req);
    }

    return true;
  }

  render() {
    return (
      <WrappedWebView
        {...this.props}
        onShouldStartLoadWithRequest={req => this.onShouldStartLoadWithRequest(req)}
      />
    );
  }
};
