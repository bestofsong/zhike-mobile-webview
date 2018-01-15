import React from 'react';
import URI from 'urijs';

function isValidValue(v) {
  return v !== null && v !== undefined;
}

function setQuery(obj, name, value) {
  if (!isValidValue(obj[name]) && isValidValue(value)) {
    Object.assign(obj, { [name]: value });
  }
}

function uriWithExtraQuery(props) {
  const { source: { uri }, query } = props;
  const { userId, token, appName, appVersion, appType } = query || {};
  const uriObj = URI(uri);
  const queryObj = { ...uriObj.search(true) };

  setQuery(queryObj, 'userId', userId);
  setQuery(queryObj, 'token', token);
  setQuery(queryObj, 'appName', appName);
  setQuery(queryObj, 'appVersion', appVersion);
  setQuery(queryObj, 'app-type', appType);

  return uriObj.search(queryObj).toString();
}

// eslint-disable-next-line
export default WrappedWebView => class extends React.Component {
  render() {
    return (
      <WrappedWebView
        {...this.props}
        source={{ uri: uriWithExtraQuery(this.props) }}
      />
    );
  }
};
