import React from 'react';
import { Linking } from 'react-native';
import URI from 'urijs';
import PropTypes from 'prop-types';

export default WrappedWebView => class extends React.Component {
  static propTypes = {
    callbackToWebpage: PropTypes.func.isRequired,
    handleDeepLink: PropTypes.func,
    onShouldStartLoadWithRequest: PropTypes.func,
  };

  static defaultProps = {
    onShouldStartLoadWithRequest: () => true,
    handleDeepLink: () => Promise.resolve(),
  };

  onShouldStartLoadWithRequest(req) {
    const { callbackToWebpage, handleDeepLink, onShouldStartLoadWithRequest } = this.props;
    const { url } = req || {};
    if (!url) {
      return false;
    }

    const uri = URI(url);
    const host = uri.host();
    const scheme = uri.scheme();
    const path = uri.path();
    const idStr = /id\d+$/;
    const httpx = /(^http)|(^https)/;
    const query = uri.search(true);

    console.log('onShouldStartLoadWithRequest: ', scheme, host, path, query);

    if (httpx.test(url)) {
      if ((host === 'itunes.apple.com' && idStr.test(path)) || host === 'a.app.qq.com') {
        Linking.openURL(url);
        callbackToWebpage(url, { code: 0 });
        console.log('app store linking');
        return false;
      }
    }

    if (scheme === 'mobile') {
      Promise.resolve(handleDeepLink({ scheme, method: host, query }))
      .then((resp) => {
        callbackToWebpage(url, resp);
      })
      .catch((e) => {
        callbackToWebpage(url, e);
      });
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
