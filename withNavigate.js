import React from 'react';
import URI from 'urijs';
import PropTypes from 'prop-types';

function handleWebpageRequest(method, params, props) {
  if (method === 'navigate') {
    const { handleNavigate } = props;
    if (typeof handleNavigate === 'function') {
      handleNavigate(params);
      return true;
    }
  } else if (method === 'launch') {
    if (params.app_name !== 'wechat') {
      console.warn('invalid native request not wechat?, ', method, params);
      return false;
    }

    const { handleLaunchWechat } = props;
    if (typeof handleLaunchWechat === 'function') {
      handleLaunchWechat(params);
      return true;
    }
  }
  return false;
}

export default WrappedWebView => class extends React.Component {
  static propTypes = {
    handleNavigate: PropTypes.func.isRequired,
    handleLaunchWechat: PropTypes.func.isRequired,
    onShouldStartLoadWithRequest: PropTypes.func,
    callbackToWebpage: PropTypes.func.isRequired,
  }

  static defaultProps = {
    onShouldStartLoadWithRequest: () => true,
  };

  constructor(props) {
    super(props);
    this.onShouldStartLoadWithRequest = this.onShouldStartLoadWithRequest.bind(this);
  }

  onShouldStartLoadWithRequest(req) {
    const { url } = req;
    if (!url) {
      return false;
    }

    const { onShouldStartLoadWithRequest } = this.props;

    const uri = URI(url);
    const scheme = uri.scheme();
    const method = uri.host();
    const params = uri.search(true);

    if (scheme === 'mobile') {
      if (handleWebpageRequest(method, params, this.props)) {
        return false;
      }
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
