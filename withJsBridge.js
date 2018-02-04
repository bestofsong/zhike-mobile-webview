import React from 'react';
import URI from 'urijs';
import PropTypes from 'prop-types';

// note: line 11, cannot assign function expression to window directly in one expression
const addMessageHandler = `(function addMessageHandler() {
  if (window.messageHandler) {
    return;
  }

  function messageHandler(e) {
    var msg = e.data;
    if (typeof msg !== 'string' || !msg.length) {
      return;
    }
    var dividerPos = msg.indexOf(':');
    if (dividerPos === -1) {
      return;
    }
    var callbackName = msg.substr(0, dividerPos);
    if (typeof callbackName !== 'string' || !callbackName.length) {
      return;
    }
    var paramsJson = msg.substr(dividerPos + 1);
    if (typeof paramsJson !== 'string' || !paramsJson.length) {
      return;
    }
    var methods = window.__ZHIKE_CALLBACKS__;
    var method = methods && methods[callbackName];
    if (typeof method === 'function') {
      method(paramsJson);
      delete methods[callbackName]
    }

    var method2 = window[callbackName];
    if (typeof method2 === 'function') {
      method2(paramsJson);
      delete window[callbackName]
    }

    var method3 = window.SS_PROMISE_SUPPORT_CALLBACKS && window.SS_PROMISE_SUPPORT_CALLBACKS[callbackName];
    if (typeof method3 === 'function') {
      method3(paramsJson);
      delete window.SS_PROMISE_SUPPORT_CALLBACKS[callbackName];
    }
  }
  window.messageHandler = messageHandler;
  document.addEventListener('message', window.messageHandler);
})();
`;

const patchPostMessageJsCode = '(function patchPostMessageFunction(){var originalPostMessage=window.postMessage;var patchedPostMessage=function patchedPostMessage(message,targetOrigin,transfer){originalPostMessage(message,targetOrigin,transfer)};patchedPostMessage.toString=function(){return String(Object.hasOwnProperty).replace("hasOwnProperty","postMessage")};window.postMessage=patchedPostMessage})();';

const addPromisify = `(function addPromiseSupport() {
  if (window.SS_PROMISE_SUPPORT_CALLBACKS) {
    return;
  }
  window.SS_PROMISE_SUPPORT_CALLBACKS = {};

  function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  var postMessageAsync = function postMessageAsync(message, targetOrigin, transfer){
    var uuid = uuidv4();
    var ret = new Promise((resolve, reject) => {
      window.SS_PROMISE_SUPPORT_CALLBACKS[uuid] = function uuidCallback(bodyJson) {
        var body;
        try {
          body = JSON.parse(bodyJson);
          if (!body || body.code !== 0) {
            reject(body);
          } else {
            resolve(body);
          }
        } catch (e) {
          reject(e);
        }
      };
    });

    window.postMessage('id' + uuid + 'id' + message, targetOrigin, transfer);
    return ret;
  };
  postMessageAsync.toString = function() {
    return String(Object.hasOwnProperty).replace("hasOwnProperty", "postMessageAsync");
  };

  window.postMessageAsync = postMessageAsync;
})();
`;

function injectedJsCode() {
  return `${addMessageHandler}${patchPostMessageJsCode}${addPromisify};`;
}


export default WrappedWebView => class extends React.Component {
  static propTypes = {
    injectedJavaScript: PropTypes.string,
    javaScriptEnabled: PropTypes.bool,
    domStorageEnabled: PropTypes.bool,
  };

  static defaultProps = {
    injectedJavaScript: '',
    javaScriptEnabled: true,
    domStorageEnabled: true,
  };

  static WEB_MASSAGE_REG = new RegExp('^id(.*?)id(.+)$');

  static parseWebMessage(msg) {
    if (typeof msg !== 'string' || !msg.length) {
      return null;
    }
    const mt = msg.match(this.WEB_MASSAGE_REG);
    if (!mt) {
      return null;
    }

    const prefix = mt[1];
    const bodyStr = mt[2];

    if (!bodyStr) {
      return null;
    }

    let body = {};
    try {
      body = JSON.parse(bodyStr);
    } catch (e) {
      console.error('json parse e: ', e);
    }

    return {
      body,
      callbackName: mt[1],
    };
  }

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

  postMessageToWebpage(req, resp) {
    if (!this.webView) {
      console.error('no WebView?');
      return;
    }

    const { callbackName } = req;
    if (!callbackName) {
      console.warn(`req: ${req} has no callbackName, cannot callback`);
      return;
    }
    this.webView.postMessage(`${callbackName}:${JSON.stringify(resp)}`);
  }

  onMessage(e) {
    const { postMessageToWebpage, handleDeepLink, onMessage } = this.props;
    if (onMessage) {
      onMessage(e);
    }

    const { data } = e.nativeEvent;
    const req = this.constructor.parseWebMessage(data);
    if (!req) {
      return;
    }
    const { body } = req;
    Promise.resolve(handleDeepLink(body))
      .catch(e => e)
      .then((resp) => {
        postMessageToWebpage(req, resp);
      });
  }

  render() {
    return (
      <WrappedWebView
        {...this.props}
        getWebView={(ref) => { this.webView = ref; }}
        injectedJavaScript={`${injectedJsCode()};${this.props.injectedJavaScript || ''}`}
        callbackToWebpage={(url, data) => this.callbackToWebpage(url, data)}
        postMessageToWebpage={(req, resp) => this.postMessageToWebpage(req, resp)}
        onMessage={e => this.onMessage(e)}
      />
    );
  }
};
