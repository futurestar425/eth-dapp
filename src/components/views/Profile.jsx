/* eslint-disable prefer-destructuring */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Avatar from 'react-avatar';
import Pagination from 'react-js-pagination';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { paramsForServer } from 'feathers-hooks-common';

import { feathersClient } from '../../lib/feathersClient';
import getNetwork from '../../lib/blockchain/getNetwork';
import GoBackButton from '../GoBackButton';
import Loader from '../Loader';
import { getUserName, getUserAvatar, getTruncatedText, convertEthHelper } from '../../lib/helpers';

import DACservice from '../../services/DACService';
import CampaignService from '../../services/CampaignService';
import Campaign from '../../models/Campaign';
import DAC from '../../models/DAC';
import Donation from '../../models/Donation';
import ProfileMilestonesTable from '../ProfileMilestonesTable';

/**
 * The user profile view mapped to /profile/{userAddress}
 *
 * @param history      Browser history object
 * @param wallet       Wallet object with the balance and all keystores
 */
class Profile extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: true,
      hasError: false,
      homeEtherScanUrl: '',
      userAddress: '',
      isLoadingDacs: true,
      dacs: null,
      isLoadingCampaigns: true,
      campaigns: null,
      visiblePages: 10,
      itemsPerPage: 25,
      skipCampaignPages: 0,
      skipDacPages: 0,
      skipDonationsPages: 0,
      isLoadingDonations: true,
      donations: null,
    };

    getNetwork().then(network => {
      this.setState({
        homeEtherScanUrl: network.homeEtherscan,
      });
    });

    this.loadUserCampaigns = this.loadUserCampaigns.bind(this);
    this.loadUserDacs = this.loadUserDacs.bind(this);
    this.handleCampaignsPageChanged = this.handleCampaignsPageChanged.bind(this);
    this.handleDacPageChanged = this.handleDacPageChanged.bind(this);
    this.handleDonationsPageChanged = this.handleDonationsPageChanged.bind(this);
  }

  componentDidMount() {
    const { userAddress } = this.props.match.params;

    feathersClient
      .service('users')
      .find({ query: { address: userAddress } })
      .then(resp => {
        this.setState(
          {
            userAddress,
            ...resp.data[0],
            isLoading: false,
            hasError: false,
          },
          () => {
            this.loadUserCampaigns();
            this.loadUserDacs();
            this.loadUserDonations();
          },
        );
      })
      .catch(() =>
        this.setState({
          userAddress,
          isLoading: false,
          hasError: true,
        }),
      );
  }

  componentWillUnmount() {
    if (this.dacsObserver) this.dacsObserver.unsubscribe();
    if (this.campaignsObserver) this.campaignsObserver.unsubscribe();
    if (this.donationsObserver) this.donationsObserver.unsubscribe();
  }

  loadUserCampaigns() {
    this.campaignsObserver = CampaignService.getUserCampaigns(
      this.state.userAddress,
      this.state.skipCampaignPages,
      this.state.itemsPerPage,
      campaigns => this.setState({ campaigns, isLoadingCampaigns: false }),
      () => this.setState({ isLoadingCampaigns: false }),
    );
  }

  loadUserDacs() {
    this.dacsObserver = DACservice.getUserDACs(
      this.state.userAddress,
      this.state.skipDacPages,
      this.state.itemsPerPage,
      dacs => this.setState({ dacs, isLoadingDacs: false }),
      () => this.setState({ isLoadingDacs: false }),
    );
  }

  loadUserDonations() {
    this.donationsObserver = feathersClient
      .service('donations')
      .watch({ listStrategy: 'always' })
      .find(
        paramsForServer({
          schema: 'includeTypeDetails',
          query: {
            giverAddress: this.state.userAddress,
            homeTxHash: { $exists: true },
            // no parentDonations is the 1st of 2 Transfer events emitted when a new donation occurs
            // we want to exclude those
            parentDonations: { $ne: [] },
            canceledPledgeId: null,
            lessThanCutoff: { $ne: true },
            $limit: this.state.itemsPerPage,
            $skip: this.state.skipDonationsPages * this.state.itemsPerPage,
          },
        }),
      )
      .subscribe(
        resp => {
          this.setState({
            donations: { ...resp, data: resp.data.map(d => new Donation(d)) },
            isLoadingDonations: false,
          });
        },
        () => {
          this.setState({ isLoadingDonations: false });
        },
      );
  }

  handleCampaignsPageChanged(newPage) {
    this.setState({ skipCampaignPages: newPage - 1, isLoadingCampaigns: true }, () =>
      this.loadUserCampaigns(),
    );
  }

  handleDacPageChanged(newPage) {
    this.setState({ skipDacPages: newPage - 1, isLoadingDacs: true }, () => this.loadUserDacs());
  }

  handleDonationsPageChanged(newPage) {
    this.setState({ skipDonationsPages: newPage - 1, isLoadingDonations: true }, () =>
      this.loadUserDonations(),
    );
  }

  render() {
    const { history } = this.props;
    const {
      isLoading,
      hasError,
      avatar,
      name,
      email,
      linkedin,
      homeEtherScanUrl,
      isLoadingDacs,
      isLoadingCampaigns,
      isLoadingDonations,
      dacs,
      campaigns,
      donations,
      visiblePages,
      userAddress,
    } = this.state;
    const user = {
      name,
      avatar,
    };

    return (
      <div id="profile-view">
        <div className="container-fluid page-layout dashboard-table-view">
          <div className="row">
            <div className="col-md-8 m-auto">
              {isLoading && <Loader className="fixed" />}

              {!isLoading && !hasError && (
                <div>
                  <GoBackButton history={history} goPreviousPage />

                  <div className="text-center">
                    <Avatar size={100} src={getUserAvatar(user)} round />
                    <h1>{getUserName(user)}</h1>
                    {homeEtherScanUrl ? (
                      <p>
                        <a
                          href={`${homeEtherScanUrl}address/${userAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {userAddress}
                        </a>
                      </p>
                    ) : (
                      <p>{userAddress}</p>
                    )}
                    <p>{email}</p>
                    <p>{linkedin}</p>
                  </div>
                </div>
              )}

              <ProfileMilestonesTable userAddress={userAddress} />

              {(isLoadingCampaigns || (campaigns && campaigns.data.length > 0)) && (
                <h4>Campaigns</h4>
              )}
              <div>
                {isLoadingCampaigns && <Loader className="small relative" />}
                {!isLoadingCampaigns && campaigns && campaigns.data.length > 0 && (
                  <div className="table-container">
                    <table className="table table-responsive table-striped table-hover">
                      <thead>
                        <tr>
                          <th className="td-name">Name</th>
                          <th className="td-donations-number">Donations</th>
                          <th className="td-donations-amount">Amount</th>
                          <th className="td-status">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.data.map(c => (
                          <tr
                            key={c._id}
                            className={c.status === Campaign.PENDING ? 'pending' : ''}
                          >
                            <td className="td-name">
                              <Link to={`/campaigns/${c._id}`}>
                                {getTruncatedText(c.title, 45)}
                              </Link>
                              <div>
                                {c.ownerAddress === userAddress && (
                                  <span className="badge badge-success">
                                    <i className="fa fa-flag-o" />
                                    Owner
                                  </span>
                                )}
                                {c.reviewerAddress === userAddress && (
                                  <span className="badge badge-info">
                                    <i className="fa fa-eye" />
                                    Reviewer
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="td-donations-number">{c.totalDonations || 0}</td>
                            <td className="td-donations-amount">
                              {c.totalDonated.map(td => (
                                <div>
                                  {convertEthHelper(td.amount, td.decimals)} {td.symbol}
                                </div>
                              ))}
                            </td>
                            <td className="td-status">
                              {(c.status === Campaign.PENDING ||
                                (Object.keys(c).includes('mined') && !c.mined)) && (
                                <span>
                                  <i className="fa fa-circle-o-notch fa-spin" />
                                  &nbsp;
                                </span>
                              )}
                              {c.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {campaigns.total > campaigns.limit && (
                      <div className="text-center">
                        <Pagination
                          activePage={campaigns.skipPages + 1}
                          itemsCountPerPage={campaigns.limit}
                          totalItemsCount={campaigns.total}
                          pageRangeDisplayed={visiblePages}
                          onChange={this.handleCampaignsPageChanged}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {(isLoadingDacs || (dacs && dacs.data.length > 0)) && <h4>Communities</h4>}
              <div>
                {isLoadingDacs && <Loader className="small relative" />}
                {!isLoadingDacs && dacs && dacs.data.length > 0 && (
                  <div className="table-container">
                    <table className="table table-responsive table-striped table-hover">
                      <thead>
                        <tr>
                          <th className="td-name">Name</th>
                          <th className="td-donations-number">Donations</th>
                          <th className="td-donations-amount">Amount</th>
                          <th className="td-status">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dacs.data.map(d => (
                          <tr key={d._id} className={d.status === DAC.PENDING ? 'pending' : ''}>
                            <td className="td-name">
                              <Link to={`/dacs/${d._id}`}>{getTruncatedText(d.title, 45)}</Link>
                              <div>
                                {d.ownerAddress === userAddress && (
                                  <span className="badge badge-success">
                                    <i className="fa fa-flag-o" />
                                    Owner
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="td-donations-number">{d.totalDonations || 0}</td>
                            <td className="td-donations-amount">
                              {d.totalDonated.map(td => (
                                <div>
                                  {convertEthHelper(td.amount, td.decimals)} {td.symbol}
                                </div>
                              ))}
                            </td>
                            <td className="td-status">
                              {d.status === DAC.PENDING && (
                                <span>
                                  <i className="fa fa-circle-o-notch fa-spin" />
                                  &nbsp;
                                </span>
                              )}
                              {d.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {dacs.total > dacs.limit && (
                      <div className="text-center">
                        <Pagination
                          activePage={dacs.skipPages + 1}
                          itemsCountPerPage={dacs.limit}
                          totalItemsCount={dacs.total}
                          pageRangeDisplayed={visiblePages}
                          onChange={this.handleDacPageChanged}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {(isLoadingDonations || (donations && donations.data.length > 0)) && (
                <h4>Donations</h4>
              )}
              <div>
                {isLoadingDonations && <Loader className="small relative" />}
                {!isLoadingDonations && (
                  <div className="table-container">
                    {donations && donations.data.length > 0 && (
                      <div>
                        <table className="table table-responsive table-striped table-hover">
                          <thead>
                            <tr>
                              <th className="td-date">Date</th>
                              <th className="td-donated-to">Donated to</th>
                              <th className="td-donations-amount">Amount</th>
                              <th className="td-transaction-status">Status</th>
                              <th className="td-tx-address">Address</th>
                            </tr>
                          </thead>
                          <tbody>
                            {donations.data.map(d => (
                              <tr key={d.id} className={d.isPending ? 'pending' : ''}>
                                <td className="td-date">
                                  {moment(d.createdAt).format('MM/DD/YYYY')}
                                </td>

                                <td className="td-donated-to">
                                  {d.intendedProjectId > 0 && (
                                    <span className="badge badge-info">
                                      <i className="fa fa-random" />
                                      &nbsp;Delegated
                                    </span>
                                  )}
                                  <Link to={d.donatedTo.url}>
                                    {d.donatedTo.type} <em>{d.donatedTo.name}</em>
                                  </Link>
                                </td>
                                <td className="td-donations-amount">
                                  {convertEthHelper(d.amount, d.token.decimals)} {d.token.symbol}
                                </td>

                                <td className="td-transaction-status">
                                  {d.isPending && (
                                    <span>
                                      <i className="fa fa-circle-o-notch fa-spin" />
                                      &nbsp;
                                    </span>
                                  )}
                                  {!d.isPending && d.amountRemaining > 0 && <span>{d.status}</span>}
                                  {!d.isPending &&
                                    d.amountRemaining === '0' &&
                                    (d.delegateId ? 'Delegated' : Donation.COMMITTED)}
                                </td>

                                {homeEtherScanUrl ? (
                                  <td className="td-tx-address">
                                    <a
                                      href={`${homeEtherScanUrl}address/${d.giverAddress}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {d.giverAddress}
                                    </a>
                                  </td>
                                ) : (
                                  <td className="td-tx-address">{d.giverAddress}</td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {donations.total > donations.limit && (
                          <div className="text-center">
                            <Pagination
                              activePage={donations.skipPages + 1}
                              itemsCountPerPage={donations.limit}
                              totalItemsCount={donations.total}
                              pageRangeDisplayed={visiblePages}
                              onChange={this.handleDonationsPageChanged}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

Profile.propTypes = {
  history: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
    push: PropTypes.func.isRequired,
  }).isRequired,
  match: PropTypes.shape({
    params: PropTypes.shape({
      userAddress: PropTypes.string,
    }).isRequired,
  }).isRequired,
};

export default Profile;
