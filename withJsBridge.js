import React from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';

// note: line 11, cannot assign function expression to window directly in one expression
// 接受原生通过postMessage向webpage发送的消息，并解析对应的格式，执行webpage设置的回调函数
// const addMessageHandler = `(function addMessageHandler() {
//   if (window.messageHandler) {
//     return;
//   }
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
//     var method2 = window[callbackName];
//     if (typeof method2 === 'function') {
//       method2(paramsJson);
//     }
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

// const patchPostMessageJsCode = '(function patchPostMessageFunction(){var originalPostMessage=window.postMessage;var patchedPostMessage=function patchedPostMessage(message,targetOrigin,transfer){originalPostMessage(message,targetOrigin,transfer)};patchedPostMessage.toString=function(){return String(Object.hasOwnProperty).replace("hasOwnProperty","postMessage")};window.postMessage=patchedPostMessage})();';

// 实现原理：包装window.postMessage，在SS_PROMISE_SUPPORT_CALLBACKS里面设置回调函数（key是随机的uuidv4），
// 把key编码到原始的postMessage的payload，发给原生
// 原生处理完执行webview.postMessage进行回调时携带uuid key，由上面的函数查找到上面提到的回调函数，resolve或reject，从而给webpage提供支持promise的api
// const addPromisify = `(function addPromiseSupport() {
//   if (window.SS_PROMISE_SUPPORT_CALLBACKS) {
//     return;
//   }
//   window.SS_PROMISE_SUPPORT_CALLBACKS = {};

//   function uuidv4() {
//     return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
//       var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
//       return v.toString(16);
//     });
//   }
//   var postMessageOrig = window.postMessage;
//   function postMessageAsync(message, targetOrigin, transfer){
//     var uuid = uuidv4();
//     var reject;
//     var ret = new Promise((resolve, reject) => {
//       reject = reject
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
//     if (message === undefined) {
//       message = null;
//     }
//     try {
//       message = JSON.stringify(message);
//     } catch (e) {
//       reject({ code: -1, msg: 'postMessage(message): cannot JSON.stringify message' });
//       return ret;
//     }
//     var msg = 'id' + uuid + 'id' + message;
//     postMessageOrig.call(window, msg, targetOrigin, transfer);
//     return ret;
//   };
//   postMessageAsync.toString = function() {
//     return String(Object.hasOwnProperty).replace("hasOwnProperty", "postMessageAsync");
//   };
//   window.postMessageAsync = postMessageAsync;
//   window.postMessage = postMessageAsync;
// })();
// `;


function injectedJsCode() {
  return `'use strict';(function(){window.messageHandler||(window.messageHandler=function(d){var f=d.data;if('string'==typeof f&&f.length){var g=f.indexOf(':');if(-1!==g){var h=f.substr(0,g);if('string'==typeof h&&h.length){var i=f.substr(g+1);if('string'==typeof i&&i.length){var j=window.__ZHIKE_CALLBACKS__,k=j&&j[h];'function'==typeof k&&k(i);var l=window[h];'function'==typeof l&&l(i);var m=window.SS_PROMISE_SUPPORT_CALLBACKS&&window.SS_PROMISE_SUPPORT_CALLBACKS[h];'function'==typeof m&&(m(i),delete window.SS_PROMISE_SUPPORT_CALLBACKS[h])}}}}},document.addEventListener('message',window.messageHandler))})(),function(){var b=window.postMessage,d=function(g,h,i){b(g,h,i)};d.toString=function(){return(Object.hasOwnProperty+'').replace('hasOwnProperty','postMessage')},window.postMessage=d}(),function(){function b(){return'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(g){var h=0|16*Math.random(),i='x'==g?h:8|3&h;return i.toString(16)})}function d(g,h,i){var k,j=b(),l=new Promise(function(n,o){o=o,window.SS_PROMISE_SUPPORT_CALLBACKS[j]=function(q){var s;try{s=JSON.parse(q),s&&0===s.code?n(s):o(s)}catch(t){o(t)}}});void 0===g&&(g=null);try{g=JSON.stringify(g)}catch(n){return k({code:-1,msg:'postMessage(message): cannot JSON.stringify message'}),l}var m='id'+j+'id'+g;return f.call(window,m,h,i),l}if(!window.SS_PROMISE_SUPPORT_CALLBACKS){window.SS_PROMISE_SUPPORT_CALLBACKS={};var f=window.postMessage;d.toString=function(){return(Object.hasOwnProperty+'').replace('hasOwnProperty','postMessageAsync')},window.postMessageAsync=d,window.postMessage=d}}();`;
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
    if (getUtilities) {
      getUtilities({ callbackToWebpage: this.callbackToWebpage });
    }
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
