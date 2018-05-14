import React from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';

// note: line 11, cannot assign function expression to window directly in one expression
// const addMessageHandler = `(function addMessageHandler() {
//   if (window.messageHandler) {
//     return;
//   }
//
//   function messageHandler(e) {
//     var msg = e.data;
//     if (typeof msg !== 'string' || !msg.length) {
//       return;
//     }
//     var dividerPos = msg.indexOf(':');
//     if (dividerPos === -1) {
//       return;
//     }
//     var callbackName = msg.substr(0, dividerPos);
//     if (typeof callbackName !== 'string' || !callbackName.length) {
//       return;
//     }
//     var paramsJson = msg.substr(dividerPos + 1);
//     if (typeof paramsJson !== 'string' || !paramsJson.length) {
//       return;
//     }
//     var methods = window.__ZHIKE_CALLBACKS__;
//     var method = methods && methods[callbackName];
//     if (typeof method === 'function') {
//       method(paramsJson);
//     }
//
//     var method2 = window[callbackName];
//     if (typeof method2 === 'function') {
//       method2(paramsJson);
//     }
//
//     var method3 = window.SS_PROMISE_SUPPORT_CALLBACKS && window.SS_PROMISE_SUPPORT_CALLBACKS[callbackName];
//     if (typeof method3 === 'function') {
//       method3(paramsJson);
//       delete window.SS_PROMISE_SUPPORT_CALLBACKS[callbackName];
//     }
//   }
//   window.messageHandler = messageHandler;
//   document.addEventListener('message', window.messageHandler);
// })();
// `;
//
// const patchPostMessageJsCode = '(function patchPostMessageFunction(){var originalPostMessage=window.postMessage;var patchedPostMessage=function patchedPostMessage(message,targetOrigin,transfer){originalPostMessage(message,targetOrigin,transfer)};patchedPostMessage.toString=function(){return String(Object.hasOwnProperty).replace("hasOwnProperty","postMessage")};window.postMessage=patchedPostMessage})();';
//
// const addPromisify = `(function addPromiseSupport() {
//   if (window.SS_PROMISE_SUPPORT_CALLBACKS) {
//     return;
//   }
//   window.SS_PROMISE_SUPPORT_CALLBACKS = {};
//
//   function uuidv4() {
//     return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
//       var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
//       return v.toString(16);
//     });
//   }
//
//   function postMessageAsync(message, targetOrigin, transfer){
//     var uuid = uuidv4();
//     var ret = new Promise((resolve, reject) => {
//       window.SS_PROMISE_SUPPORT_CALLBACKS[uuid] = function uuidCallback(bodyJson) {
//         var body;
//         try {
//           body = JSON.parse(bodyJson);
//           if (!body || body.code !== 0) {
//             reject(body);
//           } else {
//             resolve(body);
//           }
//         } catch (e) {
//           reject(e);
//         }
//       };
//     });
//     window.postMessage('id' + uuid + 'id' + message, targetOrigin, transfer);
//     return ret;
//   };
//   postMessageAsync.toString = function() {
//     return String(Object.hasOwnProperty).replace("hasOwnProperty", "postMessageAsync");
//   };
//   window.postMessageAsync = postMessageAsync;
// })();
// `;


function injectedJsCode() {
  return `'use strict';(function(){window.messageHandler||(window.messageHandler=function(d){var f=d.data;if('string'==typeof f&&f.length){var g=f.indexOf(':');if(-1!==g){var h=f.substr(0,g);if('string'==typeof h&&h.length){var i=f.substr(g+1);if('string'==typeof i&&i.length){var j=window.__ZHIKE_CALLBACKS__,k=j&&j[h];'function'==typeof k&&k(i);var l=window[h];'function'==typeof l&&l(i);var m=window.SS_PROMISE_SUPPORT_CALLBACKS&&window.SS_PROMISE_SUPPORT_CALLBACKS[h];'function'==typeof m&&(m(i),delete window.SS_PROMISE_SUPPORT_CALLBACKS[h])}}}}},document.addEventListener('message',window.messageHandler))})(),function(){var b=window.postMessage,d=function(g,h,i){b(g,h,i)};d.toString=function(){return(Object.hasOwnProperty+'').replace('hasOwnProperty','postMessage')},window.postMessage=d}(),function(){function b(){return'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(f){var g=0|16*Math.random(),h='x'==f?g:8|3&g;return h.toString(16)})}function d(f,g,h){var i=b(),j=new Promise(function(k,l){window.SS_PROMISE_SUPPORT_CALLBACKS[i]=function(n){var o;try{o=JSON.parse(n),o&&0===o.code?k(o):l(o)}catch(p){l(p)}}});return window.postMessage('id'+i+'id'+f,g,h),j}window.SS_PROMISE_SUPPORT_CALLBACKS||(window.SS_PROMISE_SUPPORT_CALLBACKS={},d.toString=function(){return(Object.hasOwnProperty+'').replace('hasOwnProperty','postMessageAsync')},window.postMessageAsync=d)}();`;
}


export default WrappedWebView => class extends React.Component {
  static propTypes = {
    injectedJavaScript: PropTypes.string,
    javaScriptEnabled: PropTypes.bool,
    domStorageEnabled: PropTypes.bool,
    onMessage: PropTypes.func,
    onWebRequest: PropTypes.func,
  };

  static defaultProps = {
    injectedJavaScript: '',
    javaScriptEnabled: true,
    domStorageEnabled: true,
    onWebRequest: () => Promise.resolve({}),
    onMessage: () => {},
  };

  static WEB_MASSAGE_REG = new RegExp('^(id(.*?)id)?(.+)$');

  static parseWebMessage(msg) {
    if (typeof msg !== 'string' || !msg.length) {
      return null;
    }
    const mt = msg.match(this.WEB_MASSAGE_REG);
    if (!mt) {
      return null;
    }

    const prefix = mt[2];
    const bodyStr = mt[3];

    if (!bodyStr) {
      return null;
    }

    let body = {};
    try {
      body = JSON.parse(bodyStr);
    } catch (e) {
      console.log('json parse msg(%s) e: ', msg, e);
      return null;
    }

    return {
      body,
      callbackName: prefix,
    };
  }

  constructor(props) {
    super(props);
    const { getUtilities } = props;
    this.callbackToWebpage = this.callbackToWebpage.bind(this);
    getUtilities({ callbackToWebpage: this.callbackToWebpage });
  }

  callbackToWebpage(callbackName, data) {
    if (!this.webView) {
      console.error('no webView?');
      return;
    }

    if (!callbackName) {
      return;
    }
    this.webView.postMessage(`${callbackName}:${JSON.stringify(data)}`);
  }

  onMessage(e) {
    const { onWebRequest, onMessage } = this.props;
    if (onMessage) {
      onMessage(e);
    }

    const { data } = e.nativeEvent;
    const req = this.constructor.parseWebMessage(data);
    if (!req) {
      return;
    }
    const { callbackName, body } = req;
    if (_.isEmpty(body)) {
      return;
    }
    Promise.resolve(onWebRequest(body))
      .catch(e => e)
      .then((resp) => {
        if (!callbackName) return;
        this.callbackToWebpage(callbackName, resp);
      });
  }

  render() {
    return (
      <WrappedWebView
        {...this.props}
        getWebView={(ref) => { this.webView = ref; }}
        injectedJavaScript={`${injectedJsCode()};${this.props.injectedJavaScript || ''}`}
        callbackToWebpage={(callbackName, data) => this.callbackToWebpage(callbackName, data)}
        onMessage={e => this.onMessage(e)}
      />
    );
  }
};
