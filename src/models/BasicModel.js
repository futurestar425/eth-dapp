import Model from './Model';
import { getTruncatedText } from '../lib/helpers';

/**
 * The DAC, Milestone and Campaign base model containing basic common interface
 */
class BasicModel extends Model {
  /**
   * Compares two campaigns
   *
   * @param a First campaign
   * @param b Second campaign
   *
   * @return 1  if a > b
   *         -1 if a < b
   *         0  if a = b
   */
  static compare(a, b) {
    if (a._Order > b._Order) return 1;
    if (a._Order < b._Order) return -1;
    return 0;
  }

  constructor({
    _id,
    title = '',
    description = '',
    image = '',
    txHash,
    owner,
    reviewer,
    url,
    totalDonated = '0',
    currentBalance = '0',
    donationCount = 0,
    peopleCount = 0,
  }) {
    super();

    this._id = _id;
    this._title = title;
    this._description = description;
    this._summary = getTruncatedText(description, 100);
    this._image = image;
    this._newImage = false;
    this._txHash = txHash;
    this._owner = owner || { address: '0x0' }; // FIXME: Check in feathers, owner should be a model
    this._reviewer = reviewer;
    this._url = url;
    this._totalDonated = totalDonated;
    this._currentBalance = currentBalance;
    this._donationCount = donationCount;
    this._peopleCount = peopleCount;
    this._Order = -1;
  }

  get id() {
    return this._id;
  }

  set id(value) {
    this.checkType(value, ['undefined', 'string'], 'id');
    this._id = value;
  }

  get title() {
    return this._title;
  }

  set title(value) {
    this.checkType(value, ['string'], 'title');
    this._title = value;
  }

  get description() {
    return this._description;
  }

  set description(value) {
    this.checkType(value, ['string'], 'description');
    this._description = value;
  }

  get summary() {
    return this._summary;
  }

  set summary(value) {
    this.checkType(value, ['string'], 'summary');
    this._summary = value;
  }

  get image() {
    return this._image;
  }

  set image(value) {
    this.checkType(value, ['string'], 'image');
    this.newImage = true;
    this._image = value;
  }

  get txHash() {
    return this._txHash;
  }

  set txHash(value) {
    this.checkType(value, ['undefined', 'string'], 'txHash');
    this._txHash = value;
  }

  get owner() {
    return this._owner;
  }

  set owner(value) {
    this.checkType(value, ['undefined', 'object'], 'owner');
    this._owner = value;
  }

  get reviewer() {
    return this._reviewer;
  }

  set reviewer(value) {
    this.checkType(value, ['undefined', 'object'], 'reviewer');
    this._reviewer = value;
  }

  get url() {
    return this._url;
  }

  set url(value) {
    this.checkType(value, ['undefined', 'string'], 'url');
    this._url = value;
  }

  get totalDonated() {
    return this._totalDonated;
  }

  set totalDonated(value) {
    this.checkType(value, ['string'], 'totalDonated');
    this._totalDonated = value;
  }

  set currentBalance(value) {
    this.checkType(value, ['string'], 'currentBalance');
    this._currentBalance = value;
  }

  get currentBalance() {
    return this._currentBalance;
  }

  get donationCount() {
    return this._donationCount;
  }

  set donationCount(value) {
    this.checkType(value, ['number'], 'donationCount');
    this._donationCount = value;
  }

  get peopleCount() {
    return this._peopleCount;
  }

  set peopleCount(value) {
    this.checkType(value, ['number'], 'peopleCount');
    this._peopleCount = value;
  }
}

export default BasicModel;
