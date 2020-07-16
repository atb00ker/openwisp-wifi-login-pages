import "./index.css";

import axios from "axios";
import PropTypes from "prop-types";
import qs from "qs";
import React from "react";
import { Cookies } from "react-cookie";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { validateApiUrl, loginError, logoutSuccess, mainToastId, getUserRadiusSessionsUrl } from "../../constants";
import getText from "../../utils/get-text";
import logError from "../../utils/log-error";
import Contact from "../contact-box";

export default class Status extends React.Component {
  constructor(props) {
    super(props);
    this.ifameRef = React.createRef();
    this.formRef = React.createRef();
    this.state = {
      username: "",
      password: "",
      sessions: [],
    };
    this.validateToken = this.validateToken.bind(this);
    this.getUserRadiusSessions = this.getUserRadiusSessions.bind(this);
    this.handleIframe = this.handleIframe.bind(this);
  }

  async componentDidMount() {
    // to prevent recursive call in case redirect url is status page
    if (window.top === window.self) {
      const { sessions } = this.state;
      const isValid = await this.validateToken();
      if (isValid) {
        await this.getUserRadiusSessions();
        if (sessions && sessions.length === 0) {
          this.formRef.current.submit();
        }
      }
    }
  }

  async getUserRadiusSessions() {
    const { cookies, orgSlug, logout } = this.props;
    const token = cookies.get(`${orgSlug}_auth_token`);
    const url = getUserRadiusSessionsUrl(orgSlug);
    try {
      const response = await axios({
        method: "post",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        url,
        data: qs.stringify({
          token,
        }),
      });
      this.setState({ sessions: response.data });
    }
    catch (error) {
      logout(cookies, orgSlug);
      toast.error(loginError, {
        onOpen: () => toast.dismiss(mainToastId),
      });
      logError(error, loginError);
    }
  }

  handleIframe() {
    const { cookies, orgSlug, logout } = this.props;
    if (this.ifameRef && this.ifameRef.current) {
      const searchParams = new URLSearchParams(this.ifameRef.current.contentWindow.location.search);
      const reply = searchParams.get("reply");
      if (reply && this.ifameRef.current.contentDocument.title.indexOf("404") < 0) {
        logout(cookies, orgSlug);
        toast.error(reply, {
          onOpen: () => toast.dismiss(mainToastId),
        });
      }
    }
  }

  async validateToken() {
    const { cookies, orgSlug, logout } = this.props;
    const token = cookies.get(`${orgSlug}_auth_token`);
    const url = validateApiUrl(orgSlug);
    try {
      const response = await axios({
        method: "post",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        url,
        data: qs.stringify({
          token,
        }),
      });
      if (response.data.response_code !== "AUTH_TOKEN_VALIDATION_SUCCESSFUL") {
        logout(cookies, orgSlug);
        toast.error(loginError, {
          onOpen: () => toast.dismiss(mainToastId),
        });
        logError(response, '"response_code" !== "AUTH_TOKEN_VALIDATION_SUCCESSFUL"');
      }
      else {
        const { radius_user_token: password, username } = response.data;
        this.setState({ username, password });
      }
      return true;
    }
    catch (error) {
      logout(cookies, orgSlug);
      toast.error(loginError, {
        onOpen: () => toast.dismiss(mainToastId),
      });
      logError(error, loginError);
      return false;
    }
  }

  render() {
    const { statusPage, language, orgSlug, logout, cookies, captivePortalForm } = this.props;
    const { content, links, buttons } = statusPage;
    const { username, password } = this.state;
    const contentArr = getText(content, language).split("\n");
    return (
      <>
        <div className="owisp-status-container">
          <div className="owisp-status-inner">
            <div className="owisp-status-content-div">
              {contentArr.map(text => {
                if (text !== "")
                  return (
                    <div className="owisp-status-content-line" key={text}>
                      {text}
                    </div>
                  );
                return null;
              })}
              {buttons.logout ? (
                <>
                  {buttons.logout.label ? (
                    <>
                      <label
                        className="owisp-status-label owisp-status-label-logout-btn"
                        htmlFor="owisp-status-logout-btn"
                      >
                        <div className="owisp-status-label-text">
                          {getText(buttons.logout.label, language)}
                        </div>
                      </label>
                    </>
                  ) : null}
                  {links
                    ? links.map(link => (
                      <Link
                        className="owisp-status-link"
                        key={link.url}
                        to={link.url.replace("{orgSlug}", orgSlug)}
                      >
                        {getText(link.text, language)}
                      </Link>
                    ))
                    : null}
                  <input
                    type="button"
                    className="owisp-status-btn owisp-status-logout-btn"
                    id="owisp-status-logout-btn"
                    value={getText(buttons.logout.text, language)}
                    onClick={() => {
                      logout(cookies, orgSlug);
                      toast.success(logoutSuccess);
                    }}
                  />
                </>
              ) : null}
            </div>
            <div className="owisp-status-contact-div">
              <Contact />
            </div>
          </div>
        </div>
        {captivePortalForm && (window.top === window.self) &&
          <>
            <form ref={this.formRef} method={captivePortalForm.method || "post"}
              id="cp-form"
              action={captivePortalForm.action || ""}
              target="owisp-auth-iframe"
              className="owisp-auth-hidden"
            >
              <input readOnly type="text" name={captivePortalForm.fields.username || ""} value={username} />
              <input readOnly type="text" name={captivePortalForm.fields.password || ""} value={password} />
              {captivePortalForm.additional_fields.length > 0 ? captivePortalForm.additional_fields.map(field =>
                <input readOnly type="text" name={field.name} value={field.value} />
              ) : null}
            </form>
            <iframe onLoad={this.handleIframe} ref={this.ifameRef} name="owisp-auth-iframe" className="owisp-auth-hidden" title="owisp-auth-iframe" />
          </>
        }
      </>
    );
  }
}

Status.propTypes = {
  statusPage: PropTypes.shape({
    content: PropTypes.object,
    links: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.object,
        url: PropTypes.string,
      }),
    ),
    buttons: PropTypes.shape({
      logout: PropTypes.object,
    }),
  }).isRequired,
  language: PropTypes.string.isRequired,
  orgSlug: PropTypes.string.isRequired,
  cookies: PropTypes.instanceOf(Cookies).isRequired,
  logout: PropTypes.func.isRequired,
  captivePortalForm: PropTypes.shape({
    method: PropTypes.string,
    action: PropTypes.string,
    fields: PropTypes.shape({
      username: PropTypes.string,
      password: PropTypes.string
    }),
    additional_fields: PropTypes.array
  }).isRequired,
};
