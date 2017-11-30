import React, { Component } from 'react';
import PropTypes from 'prop-types';
import InputToken from 'react-input-token';
import 'react-input-token/lib/style.css';

import { Form, Input } from 'formsy-react-components';
import { feathersClient } from '../../lib/feathersClient';
import Loader from '../Loader';
import QuillFormsy from '../QuillFormsy';
import FormsyImageUploader from './../FormsyImageUploader';
import GoBackButton from '../GoBackButton';
import { isOwner, getTruncatedText } from '../../lib/helpers';
import { isAuthenticated, checkWalletBalance, isInWhitelist } from '../../lib/middleware';
import LoaderButton from '../../components/LoaderButton';
import User from '../../models/User';
import GivethWallet from '../../lib/blockchain/GivethWallet';
import Campaign from '../../models/Campaign';
import CampaignService from '../../services/Campaign';

/**
 * View to create or edit a Campaign
 *
 * @param isNew    If set, component will load an empty model.
 *                 Otherwise component expects an id param and will load a campaign object
 * @param id       URL parameter which is an id of a campaign object
 * @param history  Browser history object
 * @param wallet   Wallet object with the balance and all keystores
 */
class EditCampaign extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: true,
      isSaving: false,
      formIsValid: false,
      dacsOptions: [],
      hasWhitelist: React.whitelist.reviewerWhitelist.length > 0,

      // Campaign model
      campaign: new Campaign({
        owner: props.currentUser,
      }),
    };

    this.submit = this.submit.bind(this);
    this.setImage = this.setImage.bind(this);
    this.selectDACs = this.selectDACs.bind(this);
  }

  componentDidMount() {
    isAuthenticated(this.props.currentUser, this.props.history, this.props.wallet)
      .then(() => isInWhitelist(
        this.props.currentUser, React.whitelist.projectOwnerWhitelist,
        this.props.history,
      ))
      .then(() => checkWalletBalance(this.props.wallet, this.props.history))
      .then(() => {
        this.dacsObserver = feathersClient.service('dacs')
          .watch({ strategy: 'always' })
          .find({ query: { $select: ['title', '_id'] } })
          .subscribe(
            resp =>
              this.setState({
                // TODO should we filter the available cuases to those that have been mined?
                // It is possible that a createCause tx will fail and the dac will not be
                // available
                dacsOptions: resp.data.map(({ _id, title }) => ({
                  name: title,
                  id: _id,
                  element: <span key={_id}>{title}</span>,
                })),
              }),
            () => this.setState({ isLoading: false }),
          );

        // Load this Campaign
        if (!this.props.isNew) {
          CampaignService
            .get(this.props.match.params.id)
            .then((campaign) => {
              if (isOwner(campaign.owner.address, this.props.currentUser)) {
                this.setState({ campaign, isLoading: false });
              } else this.props.history.goBack();
            })
            .catch(() => this.setState({ isLoading: false }));
        } else {
          this.setState({ isLoading: false });
        }
      });
  }

  componentWillUnmount() {
    if (this.dacsObserver) this.dacsObserver.unsubscribe();
  }

  setImage(image) {
    const { campaign } = this.state;
    campaign.image = image;
    this.setState({ campaign });
  }

  submit() {
    this.setState({ isSaving: true });

    const afterMined = (url) => {
      if (url) {
        const msg = (
          <p>Your Campaign has been created!<br />
            <a href={url} target="_blank" rel="noopener noreferrer">View transaction</a>
          </p>);
        React.toast.success(msg);
      } else {
        if (this.mounted) this.setState({ isSaving: false });
        React.toast.success('Your Campaign has been updated!');
        this.props.history.push(`/campaigns/${this.state.campaign.id}`);
      }
    };

    const afterCreate = (url) => {
      if (this.mounted) this.setState({ isSaving: false });
      const msg = (
        <p>Your Campaign is pending....<br />
          <a href={url} target="_blank" rel="noopener noreferrer">View transaction</a>
        </p>);
      React.toast.info(msg);
      this.props.history.push('/my-campaigns');
    };

    this.state.campaign.save(afterCreate, afterMined);
  }

  toggleFormValid(state) {
    this.setState({ formIsValid: state });
  }

  goBack() {
    this.props.history.push('/campaigns');
  }

  selectDACs({ target }) {
    const { campaign } = this.state;
    campaign.dacs = target.value;

    this.setState({ campaign });
  }

  render() {
    const { isNew, history } = this.props;
    const {
      isLoading, isSaving, campaign, formIsValid, dacsOptions, hasWhitelist
    } = this.state;

    return (
      <div id="edit-campaign-view">
        <div className="container-fluid page-layout edit-view">
          <div>
            <div className="col-md-8 m-auto">
              { isLoading &&
              <Loader className="fixed" />
                }

              { !isLoading &&
              <div>
                <GoBackButton history={history} />

                <div className="form-header">
                  { isNew &&
                  <h3>Start a new campaign!</h3>
                      }

                  { !isNew &&
                  <h3>Edit campaign {campaign.title}</h3>
                      }
                  <p>
                    <i className="fa fa-question-circle" />
                      A campaign solves a specific cause by executing a project via
                      its milestones. Funds raised by a campaign need to be delegated
                      to its milestones in order to be paid out.
                  </p>
                </div>


                <Form
                  onSubmit={this.submit}
                  mapping={(inputs) => {
                    campaign.title = inputs.title;
                    campaign.description = inputs.description;
                    campaign.communityUrl = inputs.communityUrl;
                    campaign.reviewerAddress = inputs.reviewerAddress;
                    campaign.tokenName = inputs.tokenName;
                    campaign.tokenSymbol = inputs.tokenSymbol;
                    campaign.summary = getTruncatedText(inputs.description, 100);
                  }}
                  onValid={() => this.toggleFormValid(true)}
                  onInvalid={() => this.toggleFormValid(false)}
                  layout="vertical"
                >
                  <Input
                    name="title"
                    id="title-input"
                    label="What are you working on?"
                    type="text"
                    value={campaign.title}
                    placeholder="E.g. Installing 1000 solar panels."
                    help="Describe your campaign in 1 sentence."
                    validations="minLength:3"
                    validationErrors={{ minLength: 'Please provide at least 3 characters.' }}
                    required
                    autoFocus
                  />

                  <QuillFormsy
                    name="description"
                    label="Explain how you are going to do this successfully."
                    helpText="Make it as extensive as necessary.
                      Your goal is to build trust, so that people donate Ether to your campaign."
                    value={campaign.description}
                    placeholder="Describe how you're going to execute your campaign successfully..."
                    validations="minLength:20"
                    help="Describe your campaign."
                    validationErrors={{ minLength: 'Please provide at least 10 characters.' }}
                    required
                  />

                  <div className="form-group">
                    <FormsyImageUploader
                      setImage={this.setImage}
                      previewImage={campaign.image}
                      isRequired={isNew}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="dac">
                      Relate your campaign to a community
                      <small className="form-text" >By relating your campaign to a
                        community, Ether from that community can be delegated to your campaign.
                        This increases your chances of successfully funding your campaign.
                      </small>
                      <InputToken
                        name="dac"
                        id="dac"
                        placeholder="Select one or more communities (DACs)"
                        value={campaign.dacs}
                        options={dacsOptions}
                        onSelect={this.selectDACs}
                      />
                    </label>
                  </div>

                  <div className="form-group">
                    <Input
                      name="communityUrl"
                      id="community-url"
                      label="Url to join your community"
                      type="text"
                      value={campaign.communityUrl}
                      placeholder="https://slack.giveth.com"
                      help="Where can people join your community? Giveth redirect people there."
                      validations="isUrl"
                      validationErrors={{ isUrl: 'Please provide a url.' }}
                    />
                  </div>

                  <div className="form-group">
                    <Input
                      name="tokenName"
                      id="token-name-input"
                      label="Token Name"
                      type="text"
                      value={campaign.tokenName}
                      placeholder={campaign.title}
                      help="The name of the token that givers will receive when they
                        donate to this campaign."
                      validations="minLength:3"
                      validationErrors={{ minLength: 'Please provide at least 3 characters.' }}
                      required
                      disabled={!isNew}
                    />
                  </div>

                  <div className="form-group">
                    <Input
                      name="tokenSymbol"
                      id="token-symbol-input"
                      label="Token Symbol"
                      type="text"
                      value={campaign.tokenSymbol}
                      help="The symbol of the token that givers will receive when
                        they donate to this campaign."
                      validations="minLength:2"
                      validationErrors={{ minLength: 'Please provide at least 2 characters.' }}
                      required
                      disabled={!isNew}
                    />
                  </div>

                  <div className="form-group">
                    <Input
                      name="reviewerAddress"
                      id="title-input"
                      label="Reviewer Address"
                      type="text"
                      value={campaign.reviewerAddress}
                      placeholder="0x0000000000000000000000000000000000000000"
                      help={hasWhitelist 
                        ? "This person or smart contract will be reviewing your campaign to increase trust for donators. It has been automatically assigned."
                        : "This person or smart contract will be reviewing your campaign to increase trust for donators."}
                      validations="isEtherAddress"
                      validationErrors={{ isEtherAddress: 'Please enter a valid Ethereum address.' }}
                      required
                      disabled={hasWhitelist}
                    />
                  </div>

                  <div className="form-group row">
                    <div className="col-md-6">
                      <GoBackButton history={history} />
                    </div>
                    <div className="col-md-6">
                      <LoaderButton
                        className="btn btn-success pull-right"
                        formNoValidate
                        type="submit"
                        disabled={isSaving || !formIsValid}
                        isLoading={isSaving}
                        loadingText="Saving..."
                      >
                        {isNew ? 'Create' : 'Update'} Campaign
                      </LoaderButton>
                    </div>
                  </div>

                </Form>
              </div>
                }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

EditCampaign.propTypes = {
  currentUser: PropTypes.instanceOf(User).isRequired,
  history: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
    push: PropTypes.func.isRequired,
  }).isRequired,
  isNew: PropTypes.bool,
  wallet: PropTypes.instanceOf(GivethWallet).isRequired,
  match: PropTypes.shape({
    params: PropTypes.shape({
      id: PropTypes.string,
    }).isRequired,
  }).isRequired,
};

EditCampaign.defaultProps = {
  isNew: false,
};

export default EditCampaign;
