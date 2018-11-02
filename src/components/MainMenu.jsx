import React, { Component } from 'react';
import Avatar from 'react-avatar';
import { Link, NavLink, withRouter } from 'react-router-dom';

import { Consumer as UserConsumer } from '../contextProviders/UserProvider';
import { Consumer as Web3Consumer } from '../contextProviders/Web3Provider';
import { history } from '../lib/helpers';

// Broken rule that can not find the correct id tag
/* eslint jsx-a11y/aria-proptypes: 0 */
/**
 * The main top menu
 */
class MainMenu extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showMobileMenu: false,
    };
  }

  componentDidMount() {
    // when route changes, close the menu
    history.listen(() => this.setState({ showMobileMenu: false }));
  }

  toggleMobileMenu() {
    this.setState(prevState => ({ showMobileMenu: !prevState.showMobileMenu }));
  }

  render() {
    const { showMobileMenu } = this.state;

    return (
      <Web3Consumer>
        {({ state: { validProvider, isEnabled }, actions: { enableProvider } }) => (
          <UserConsumer>
            {({ state }) => (
              <div>
                <nav
                  id="main-menu"
                  className={`navbar navbar-expand-lg fixed-top ${showMobileMenu ? 'show' : ''} `}
                >
                  <button
                    className="navbar-toggler navbar-toggler-right"
                    type="button"
                    onClick={() => this.toggleMobileMenu()}
                  >
                    <i
                      className={`navbar-toggler-icon fa ${
                        showMobileMenu ? 'fa-close' : 'fa-bars'
                      }`}
                    />
                  </button>

                  <Link className="navbar-brand" to="/">
                    <img src="/img/Giveth-typelogo.svg" width="70px" alt="Giveth logo" />
                  </Link>

                  <div
                    className={`collapse navbar-collapse ${showMobileMenu ? 'show' : ''} `}
                    id="navbarSupportedContent"
                  >
                    <ul className="navbar-nav mr-auto">
                      <li className="nav-item">
                        <NavLink className="nav-link" to="/dacs" activeClassName="active">
                          Communities
                        </NavLink>
                      </li>
                      <li className="nav-item">
                        <NavLink className="nav-link" to="/campaigns" activeClassName="active">
                          Campaigns
                        </NavLink>
                      </li>

                      {validProvider &&
                        state.currentUser && (
                          <li className="nav-item dropdown">
                            <NavLink
                              className="nav-link dropdown-toggle"
                              id="navbarDropdownDashboard"
                              to="/dashboard"
                              disabled={!state.currentUser}
                              activeClassName="active"
                              data-toggle="dropdown"
                              aria-haspopup="true"
                              aria-expanded="false"
                            >
                              Manage
                            </NavLink>
                            <div
                              className={`dropdown-menu ${showMobileMenu ? 'show' : ''} `}
                              aria-labelledby="navbarDropdownDashboard"
                            >
                              <NavLink className="dropdown-item" to="/my-milestones">
                                My Milestones
                              </NavLink>
                              <NavLink className="dropdown-item" to="/donations">
                                My Donations
                              </NavLink>
                              <NavLink className="dropdown-item" to="/delegations">
                                My Delegations
                              </NavLink>
                              <NavLink className="dropdown-item" to="/my-dacs">
                                My Communities
                              </NavLink>
                              <NavLink className="dropdown-item" to="/my-campaigns">
                                My Campaigns
                              </NavLink>
                            </div>
                          </li>
                        )}
                    </ul>

                    {/*
            <form id="search-form" className="form-inline my-2 my-lg-0">
              <input className="form-control mr-sm-2" type="text" placeholder="E.g. save the whales"/>
              <button className="btn btn-outline-success my-2 my-sm-0" type="submit">Find</button>
            </form>
          */}

                    <ul className="navbar-nav">
                      {validProvider &&
                        !isEnabled && (
                          <button
                            type="button"
                            className="btn btn-outline-success btn-sm"
                            onClick={() => enableProvider()}
                          >
                            Enable Web3
                          </button>
                        )}
                      {validProvider &&
                        isEnabled &&
                        !state.currentUser && (
                          <small className="text-muted">Please unlock MetaMask</small>
                        )}

                      {state.currentUser && (
                        <li className="nav-item dropdown">
                          <Link
                            className="nav-link dropdown-toggle"
                            id="navbarDropdownYou"
                            to="/"
                            data-toggle="dropdown"
                            aria-haspopup="true"
                            aria-expanded="false"
                          >
                            {state.currentUser.avatar && (
                              <Avatar
                                className="menu-avatar"
                                size={30}
                                src={state.currentUser.avatar}
                                round
                              />
                            )}

                            {state.currentUser.name && <span>{state.currentUser.name}</span>}

                            {!state.currentUser.name && <span>Hi, you!</span>}
                          </Link>
                          <div
                            className={`dropdown-menu dropdown-profile ${
                              showMobileMenu ? 'show' : ''
                            }`}
                            aria-labelledby="navbarDropdownYou"
                          >
                            <NavLink className="dropdown-item" to="/profile">
                              Profile
                            </NavLink>
                            <NavLink className="dropdown-item" to="/wallet">
                              Wallet
                            </NavLink>
                          </div>
                        </li>
                      )}
                    </ul>
                  </div>
                </nav>
              </div>
            )}
          </UserConsumer>
        )}
      </Web3Consumer>
    );
  }
}

export default withRouter(MainMenu);

MainMenu.propTypes = {};

MainMenu.defaultProps = {};
