import React from 'react';
import { Linking } from 'react-native';
import URI from 'urijs';
import PropTypes from 'prop-types';

export default WrappedWebView => class extends React.Component {
  static propTypes = {
    callbackToWebpage: PropTypes.func.isRequired,
    onWebRequest: PropTypes.func,
    onShouldStartLoadWithRequest: PropTypes.func,
  };

  static defaultProps = {
    onShouldStartLoadWithRequest: () => true,
    onWebRequest: () => Promise.resolve({}),
  };

  onShouldStartLoadWithRequest(req) {
    const { callbackToWebpage, onWebRequest, onShouldStartLoadWithRequest } = this.props;
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

    if (httpx.test(url)) {
      if ((host === 'itunes.apple.com' && idStr.test(path)) || host === 'a.app.qq.com') {
        Linking.openURL(url);
        return false;
      }

      return true;
    }

    const callbackName = query.callback_name;
    if (scheme === 'mobile') {
      Promise.resolve(onWebRequest({ scheme, method: host, query }))
        .then((resp) => {
          if (!callbackName) return;
          callbackToWebpage(callbackName, resp);
        })
        .catch((e) => {
          if (!callbackName) return;
          callbackToWebpage(callbackName, e);
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
