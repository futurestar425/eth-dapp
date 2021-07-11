import React, { Fragment, useCallback, useContext } from 'react';
import {
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  notification,
  Row,
  Select,
  Typography,
  Upload,
} from 'antd';
import 'antd/dist/antd.css';
import PropTypes from 'prop-types';
import { DeleteTwoTone } from '@ant-design/icons';
import ImgCrop from 'antd-img-crop';
import moment from 'moment';
import Web3 from 'web3';
import config from '../configuration';
import { IPFSService } from '../services';
import useReviewers from '../hooks/useReviewers';
import { getStartOfDayUTC, getHtmlText, ANY_TOKEN } from '../lib/helpers';
import Editor from './Editor';
import { Context as WhiteListContext } from '../contextProviders/WhiteListProvider';

const TraceTitle = ({ extra, onChange, value, disabled }) => (
  <Form.Item
    name="title"
    label="Title"
    className="custom-form-item"
    extra={extra}
    rules={[
      {
        required: true,
        type: 'string',
        min: 3,
        message: 'Please provide at least 3 characters',
      },
    ]}
  >
    <Input
      value={value}
      disabled={disabled}
      name="title"
      placeholder="e.g. Support continued Development"
      onChange={onChange}
    />
  </Form.Item>
);

TraceTitle.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  extra: PropTypes.string,
  disabled: PropTypes.bool,
};

TraceTitle.defaultProps = {
  value: '',
  extra: '',
  disabled: false,
};

const TraceDescription = ({
  extra,
  onChange,
  placeholder,
  value,
  label,
  id,
  disabled,
  initialValue,
}) => {
  const onDescriptionChange = useCallback(
    description => {
      onChange({ target: { name: 'description', value: description } });
    },
    [onChange],
  );

  return (
    <Form.Item
      name={id}
      label={label}
      className="custom-form-item"
      extra={extra}
      required
      initialValue={initialValue}
      rules={[
        {
          type: 'string',
          message: 'Description is required',
        },
        {
          validator: (rule, val) => {
            if (val && getHtmlText(val).length > 10) {
              return Promise.resolve();
            }
            // eslint-disable-next-line prefer-promise-reject-errors
            return Promise.reject('Please provide at least 10 characters in description');
          },
        },
      ]}
    >
      <Editor
        name="description"
        onChange={onDescriptionChange}
        value={value}
        placeholder={placeholder}
        id={id}
        key={id}
        disabled={disabled}
        initialValue={initialValue}
      />
    </Form.Item>
  );
};

TraceDescription.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  extra: PropTypes.string,
  placeholder: PropTypes.string,
  label: PropTypes.string,
  id: PropTypes.string,
  disabled: PropTypes.bool,
  initialValue: PropTypes.string,
};

TraceDescription.defaultProps = {
  extra: '',
  placeholder: '',
  label: 'Description',
  id: '',
  disabled: false,
  initialValue: '',
};

const TracePicture = ({ picture, setPicture, traceTitle, disabled }) => {
  const uploadProps = {
    multiple: false,
    accept: 'image/png, image/jpeg',
    customRequest: options => {
      const { onSuccess, onError, file } = options;
      IPFSService.upload(file)
        .then(onSuccess)
        .catch(err => {
          onError('Failed!', err);
        });
    },
    onChange(info) {
      const { status } = info.file;
      if (status !== 'uploading') {
        console.log(info.file, info.fileList);
      }
      if (status === 'done') {
        console.log('file uploaded successfully.', info.file.response);
        setPicture(info.file.response);
      } else if (status === 'error') {
        console.log(`${info.file.name} file upload failed.`);
        const args = {
          message: 'Error',
          description: 'Cannot upload picture to IPFS',
        };
        notification.error(args);
      }
    },
  };

  function removePicture() {
    setPicture('');
  }

  return (
    <Form.Item
      name="picture"
      label="Add a picture (optional)"
      className="custom-form-item"
      extra="A picture says more than a thousand words. Select a png or jpg file in a 1:1
                    aspect ratio."
    >
      <Fragment>
        {picture ? (
          <div className="picture-upload-preview">
            <img src={`${config.ipfsGateway}${picture.slice(6)}`} alt={traceTitle} />
            {!disabled && <DeleteTwoTone onClick={removePicture} disabled={disabled} />}
          </div>
        ) : (
          <ImgCrop aspect={16 / 9}>
            <Upload.Dragger {...uploadProps} style={disabled ? { display: 'none' } : {}}>
              <p className="ant-upload-text">
                Drag and Drop JPEG, PNG here or <span>Attach a file.</span>
              </p>
            </Upload.Dragger>
          </ImgCrop>
        )}
      </Fragment>
    </Form.Item>
  );
};

TracePicture.propTypes = {
  picture: PropTypes.string.isRequired,
  traceTitle: PropTypes.string.isRequired,
  setPicture: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

TracePicture.defaultProps = {
  disabled: false,
};

const TraceDonateToCommunity = ({ onChange, value, disabled }) => (
  <Form.Item
    className="custom-form-item trace-donate-community"
    valuePropName="checked"
    extra={
      <div>
        Your help keeps Giveth alive.
        <span role="img" aria-label="heart">
          {' '}
          ❤️
        </span>
      </div>
    }
  >
    <Checkbox onChange={onChange} name="donateToCommunity" checked={value} disabled={disabled}>
      Donate 3% to Giveth
    </Checkbox>
  </Form.Item>
);

TraceDonateToCommunity.propTypes = {
  value: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

TraceDonateToCommunity.defaultProps = {
  disabled: false,
};

const TraceReviewer = ({
  traceType,
  hasReviewer,
  traceReviewerAddress,
  setReviewer,
  initialValue,
  toggleHasReviewer,
  disabled,
}) => {
  const reviewers = useReviewers();
  return (
    <Fragment>
      <Form.Item className="custom-form-item trace-reviewer" valuePropName="checked">
        {toggleHasReviewer && (
          <Checkbox
            className="trace-reviewer-checkbox"
            name="hasReviewer"
            checked={hasReviewer}
            onChange={toggleHasReviewer}
            disabled={disabled}
          />
        )}
        <span>{`${traceType} reviewer`}</span>
      </Form.Item>
      {hasReviewer && (
        <Fragment>
          <Form.Item
            name="Reviewer Address"
            initialValue={initialValue}
            rules={[{ required: true }]}
            extra={`The reviewer verifies that the ${traceType} is completed successfully.`}
          >
            <Select
              showSearch
              placeholder="Select a reviewer"
              optionFilterProp="children"
              name="reviewerAddress"
              onSelect={setReviewer}
              disabled={disabled}
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
              value={traceReviewerAddress}
            >
              {reviewers.map(({ name, address }) => (
                <Select.Option
                  key={address}
                  value={address}
                >{`${name} - ${address}`}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Fragment>
      )}
    </Fragment>
  );
};

TraceReviewer.propTypes = {
  traceType: PropTypes.string,
  hasReviewer: PropTypes.bool.isRequired,
  toggleHasReviewer: PropTypes.func,
  setReviewer: PropTypes.func.isRequired,
  traceReviewerAddress: PropTypes.string,
  initialValue: PropTypes.string,
  disabled: PropTypes.bool,
};

TraceReviewer.defaultProps = {
  traceType: 'Milestone',
  traceReviewerAddress: '',
  toggleHasReviewer: null,
  initialValue: null,
  disabled: false,
};

const TraceDatePicker = ({ onChange, value, disabled }) => {
  const maxValue = getStartOfDayUTC().subtract(1, 'd');

  return (
    <Row gutter={16}>
      <Col className="gutter-row" span={10}>
        <Form.Item label="Date" className="custom-form-item">
          <DatePicker
            disabledDate={current => {
              return current && current > moment().startOf('day');
            }}
            rules={[
              {
                required: true,
              },
            ]}
            defaultValue={value || maxValue}
            onChange={(_, dateString) => onChange(getStartOfDayUTC(dateString))}
            disabled={disabled}
          />
        </Form.Item>
      </Col>
    </Row>
  );
};

TraceDatePicker.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(moment)]),
  disabled: PropTypes.bool,
};

TraceDatePicker.defaultProps = {
  value: undefined,
  disabled: false,
};

const TraceCampaignInfo = ({ campaign }) => (
  <div className="campaign-info">
    <div className="lable">Campaign</div>
    <div className="content">{campaign && campaign.title}</div>
  </div>
);
TraceCampaignInfo.propTypes = {
  campaign: PropTypes.shape({
    title: PropTypes.string,
  }),
};
TraceCampaignInfo.defaultProps = {
  campaign: {},
};

const TraceToken = ({
  label,
  onChange,
  value,
  totalAmount,
  includeAnyToken,
  hideTotalAmount,
  initialValue,
  disabled,
}) => {
  const {
    state: { activeTokenWhitelist },
  } = useContext(WhiteListContext);

  const handleSelectToken = (_, { value: symbol }) => {
    onChange(
      symbol === ANY_TOKEN.symbol ? ANY_TOKEN : activeTokenWhitelist.find(t => t.symbol === symbol),
    );
  };

  return (
    <Row gutter={16} align="middle">
      <Col className="gutter-row" span={12}>
        <Form.Item
          name="Token"
          label={label}
          className="custom-form-item"
          extra="Select the token you want to be reimbursed in."
          rules={[{ required: true, message: 'Payment currency is required' }]}
          initialValue={initialValue.symbol}
        >
          <Select
            showSearch
            placeholder="Select a Currency"
            optionFilterProp="children"
            name="token"
            onSelect={handleSelectToken}
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
            value={value && value.symbol}
            required
            disabled={disabled}
          >
            {includeAnyToken && (
              <Select.Option key={ANY_TOKEN.name} value={ANY_TOKEN.symbol}>
                Any Token
              </Select.Option>
            )}
            {activeTokenWhitelist.map(token => (
              <Select.Option key={token.name} value={token.symbol}>
                {token.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Col>
      {!hideTotalAmount && (
        <Col className="gutter-row" span={12}>
          <Typography.Text className="ant-form-text" type="secondary">
            ≈ {totalAmount}
          </Typography.Text>
        </Col>
      )}
    </Row>
  );
};

TraceToken.propTypes = {
  label: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.shape({
    symbol: PropTypes.string,
    name: PropTypes.string,
  }),
  totalAmount: PropTypes.string,
  includeAnyToken: PropTypes.bool,
  hideTotalAmount: PropTypes.bool,
  initialValue: PropTypes.shape({
    symbol: PropTypes.string,
  }),
  disabled: PropTypes.bool,
};

TraceToken.defaultProps = {
  value: {},
  totalAmount: '0',
  includeAnyToken: false,
  hideTotalAmount: false,
  initialValue: {
    symbol: null,
  },
  disabled: false,
};

const TraceRecipientAddress = ({ label, onChange, value, disabled }) => (
  <Form.Item
    name="recipientAddress"
    label={label}
    className="custom-form-item"
    extra="If you don’t change this field the address associated with your account will be
              used."
    rules={[
      {
        validator: async (_, inputValue) => {
          if (inputValue && !Web3.utils.isAddress(inputValue)) {
            throw new Error('Please insert a valid Ethereum address.');
          }
        },
      },
    ]}
  >
    <Input
      value={value}
      name="recipientAddress"
      placeholder="0x"
      onChange={onChange}
      required
      disabled={disabled}
    />
  </Form.Item>
);

TraceRecipientAddress.propTypes = {
  label: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
  disabled: PropTypes.bool,
};
TraceRecipientAddress.defaultProps = {
  value: '',
  disabled: false,
};

const TraceFiatAmountCurrency = ({
  onAmountChange,
  onCurrencyChange,
  amount,
  currency,
  id,
  disabled,
  initialValues,
}) => {
  const {
    state: { fiatWhitelist },
  } = useContext(WhiteListContext);

  return (
    <Row gutter={16}>
      <Col className="gutter-row" span={10}>
        <Form.Item
          name={`amount-${id}`}
          label="Amount"
          className="custom-form-item"
          extra="The amount should be the same as on the receipt."
          rules={[
            { required: true, message: 'Amount is required' },
            {
              pattern: /^\d*\.?\d*$/,
              message: 'Amount should contain just number',
            },
            {
              validator: async (_, val) => {
                if (val && Number.isNaN(val) === false && val <= 0) {
                  throw new Error('Amount should be greater than zero');
                }
              },
            },
          ]}
          initialValue={initialValues.fiatAmount}
        >
          <Input
            name="fiatAmount"
            value={amount}
            placeholder="Enter Amount"
            onChange={onAmountChange}
            autoComplete="off"
            disabled={disabled}
          />
        </Form.Item>
      </Col>
      <Col className="gutter-row" span={10}>
        <Form.Item
          name={`currency-${id}`}
          label="Currency"
          className="custom-form-item"
          extra="Select the currency of this expense."
          rules={[{ required: true, message: 'Amount currency is required' }]}
          initialValue={initialValues.selectedFiatType}
        >
          <Select
            showSearch
            placeholder="Select a Currency"
            optionFilterProp="children"
            name="currency"
            onSelect={onCurrencyChange}
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
            value={currency}
            required
            disabled={disabled}
          >
            {fiatWhitelist.map(cur => (
              <Select.Option key={cur} value={cur}>
                {cur}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Col>
    </Row>
  );
};

TraceFiatAmountCurrency.propTypes = {
  onAmountChange: PropTypes.func.isRequired,
  onCurrencyChange: PropTypes.func.isRequired,
  amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  currency: PropTypes.string,
  id: PropTypes.string,
  disabled: PropTypes.bool,
  initialValues: PropTypes.shape({
    selectedFiatType: PropTypes.string,
    fiatAmount: PropTypes.number,
  }),
};
TraceFiatAmountCurrency.defaultProps = {
  amount: 0,
  currency: '',
  id: '',
  disabled: false,
  initialValues: {
    selectedFiatType: null,
    fiatAmount: 0,
  },
};

// eslint-disable-next-line import/prefer-default-export
export {
  TraceTitle,
  TraceDescription,
  TracePicture,
  TraceDonateToCommunity,
  TraceReviewer,
  TraceDatePicker,
  TraceCampaignInfo,
  TraceToken,
  TraceRecipientAddress,
  TraceFiatAmountCurrency,
};
