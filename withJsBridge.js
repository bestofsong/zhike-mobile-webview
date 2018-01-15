import React from 'react';
import URI from 'urijs';
import PropTypes from 'prop-types';

function injectedJsCode() {
  return `
  (function() {
    if (window.messageHandler) {
      return;
    }

    window.messageHandler = e => {
      var msg = e.data;
      setTimeout(() => alert("callback: " + msg), 100);
      if (typeof msg !== 'string' || !msg.length) {
        setTimeout(() => alert("wrong: " + msg), 100);
        return;
      }
      var dividerPos = msg.indexOf(':');
      if (dividerPos === -1) {
        setTimeout(() => alert("wrong: " + msg), 100);
        return;
      }
      var callbackName = msg.substr(0, dividerPos);
      if (typeof callbackName !== 'string' || !callbackName.length) {
        setTimeout(() => alert("wrong: " + msg), 100);
        return;
      }
      var paramsJson = msg.substr(dividerPos + 1);
      if (typeof paramsJson !== 'string' || !paramsJson.length) {
        setTimeout(() => alert("wrong: " + msg), 100);
        return;
      }
      var methods = window.__ZHIKE_CALLBACKS__;
      var method = methods && methods[callbackName];
      if (typeof method !== 'function') {
        setTimeout(() => alert("method not function: " + msg), 100);
      } else {
        method(paramsJson);
      }
    }
    document.addEventListener('message', window.messageHandler);
  })();
  `;
}


export default WrappedWebView => class extends React.Component {
  static propTypes = {
    injectedJavaScript: PropTypes.string,
  };

  static defaultProps = {
    injectedJavaScript: '',
  };

  callbackToWebpage(url, data) {
    if (!this.webView) {
      console.error();
      return;
    }

    const uri = URI(url);
    const query = uri.search(true);
    const callbackName = query && query.callback_name;
    if (!callbackName) {
      console.error(`url: ${url} has no callbackName, cannot callback`);
      return;
    }
    this.webView.postMessage(`${callbackName}:${JSON.stringify(data)}`);
  }

  render() {
    return (
      <WrappedWebView
        {...this.props}
        getWebView={(ref) => { this.webView = ref; }}
        callbackToWebpage={(url, data) => this.callbackToWebpage(url, data)}
        injectedJavaScript={`${injectedJsCode()}; ${this.props.injectedJavaScript || ''}`}
      />
    );
  }
};
