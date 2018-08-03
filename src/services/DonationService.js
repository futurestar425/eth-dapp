import { LPPCampaign } from 'lpp-campaign';
import { utils } from 'web3';
import BigNumber from 'bignumber.js';

import Donation from '../models/Donation';
import DAC from '../models/DAC';
import getNetwork from '../lib/blockchain/getNetwork';
import { feathersClient } from '../lib/feathersClient';
import { getWeb3 } from '../lib/blockchain/getWeb3';

import ErrorPopup from '../components/ErrorPopup';
// import Campaign from '../models/Campaign';

function updateExistingDonation(donation, amount, status) {
  const mutation = {
    pendingAmountRemaining: utils
      .toBN(donation.amountRemaining)
      .sub(utils.toBN(amount))
      .toString(),
  };
  if (status) {
    mutation.status = status;
  }

  return feathersClient
    .service('donations')
    .patch(donation.id, mutation)
    .catch(err => {
      ErrorPopup('Unable to update the donation in feathers', err);
    });
}

class DonationService {
  /**
   * Delegate multiple donations to some entity (either Campaign or Milestone)
   *
   * @param {Array}    donations   Array of donations that can be delegated
   * @param {string}   amount      Total ammount in wei to be delegated - needs to be between 0 and total donation amount
   * @param {Object}   delegateTo  Entity to which the donation should be delegated
   * @param {function} onCreated   Callback function after the transaction has been broadcasted to chain and stored in feathers
   * @param {function} onSuccess   Callback function after the transaction has been mined
   * @param {function} onError     Callback function after error happened
   */
  static delegateMultiple(
    donations,
    amount,
    delegateTo,
    onCreated = () => {},
    onSuccess = () => {},
    onError = () => {},
  ) {
    const { ownerType, ownerEntity, delegateEntity, delegate } = donations[0];
    let txHash;
    let etherScanUrl;
    const pledgedDonations = []; // Donations that have been pledged and should be updated in feathers

    /**
     * Decide which pledges should be used and encodes them for the contracts
     *
     * @return {Array} Array of strings with encoded pledges to delegate
     */
    const getPledges = () => {
      const maxAmount = new BigNumber(amount);
      let currentAmount = new BigNumber('0');
      let fullyDonated = true;

      const pledges = [];
      donations.every(donation => {
        const pledge = pledges.find(n => n.id === donation.pledgeId);

        let donatedAmount = new BigNumber(donation.amount);

        // The next donation is too big, we have to split it
        if (currentAmount.plus(donatedAmount).isGreaterThan(maxAmount)) {
          donatedAmount = maxAmount.minus(currentAmount);
          fullyDonated = false;

          // This donation would have value of 0, stop the iteration before it is added
          if (donatedAmount.isEqualTo(new BigNumber('0'))) return fullyDonated;
        }
        pledgedDonations.push({ donation, fullyDonated });

        currentAmount = currentAmount.plus(donatedAmount);
        if (pledge) {
          pledge.amount = pledge.amount.plus(donatedAmount);
        } else {
          pledges.push({
            id: donation.pledgeId,
            amount: donatedAmount,
          });
        }
        return fullyDonated;
      });

      return pledges.map(
        note =>
          // due to some issue in web3, utils.toHex(note.amount) breaks during minification.
          // BN.toString(16) will return a hex string as well
          `0x${utils.padLeft(note.amount.toString(16), 48)}${utils.padLeft(
            utils.toHex(note.id).substring(2),
            16,
          )}`,
      );
    };

    Promise.all([getNetwork(), getWeb3(), getPledges()])
      .then(([network, web3, pledges]) => {
        etherScanUrl = network.etherscan;

        const receiverId = delegateTo.projectId;

        const executeTransfer = () => {
          let contract;

          if (ownerType.toLowerCase() === 'campaign') {
            contract = new LPPCampaign(web3, ownerEntity.pluginAddress);

            return contract.mTransfer(pledges, receiverId, {
              from: ownerEntity.ownerAddress,
              $extraGas: 100000,
            });
          }
          return network.liquidPledging.mTransfer(delegate, pledges, receiverId, {
            from: delegateEntity.ownerAddress,
            $extraGas: 100000,
          });
        };

        return executeTransfer()
          .once('transactionHash', hash => {
            txHash = hash;
            const mutation = {
              txHash,
              status: 'pending',
            };

            // Update the delegated donations in feathers
            pledgedDonations.forEach(d => {
              if (d.fullyDonated) {
                if (d.donation.ownerType.toLowerCase() === 'campaign') {
                  // campaign is the owner, so they transfer the donation, not propose
                  Object.assign(mutation, {
                    owner: delegateTo.projectId,
                    ownerId: delegateTo.id || delegateTo._id,
                    ownerType: delegateTo.type,
                  });
                } else {
                  // dac proposes a delegation
                  Object.assign(mutation, {
                    intendedProject: delegateTo.projectId,
                    intendedProjectId: delegateTo.id || delegateTo._id,
                    intendedProjectType: delegateTo.type,
                  });
                }
              }

              feathersClient
                .service('/donations')
                .patch(d.donation.id, mutation)
                .then(() => onCreated(`${etherScanUrl}tx/${txHash}`))
                .catch(err => {
                  ErrorPopup('Unable to update the donation in feathers', err);
                  onError(err);
                });
            });
          })
          .catch(err => {
            if (txHash && err.message && err.message.includes('unknown transaction')) return; // bug in web3 seems to constantly fail due to this error, but the tx is correct
            ErrorPopup(
              'Thare was a problem with the delegation transaction.',
              `${etherScanUrl}tx/${txHash}`,
            );
            onError(err);
          });
      })
      .then(() => onSuccess(`${etherScanUrl}tx/${txHash}`))
      .catch(err => {
        ErrorPopup('Unable to initiate the delegation transaction.', err);
        onError(err);
      });
  }

  /**
   * Delegate the donation to some entity (either Campaign or Milestone)
   *
   * @param {Donation} donation    Donation to be delegated
<<<<<<< HEAD
   * @param {string}   amount      Amount of the donation that is to be delegated - needs to be between 0 and donation amount
   * @param {object}   delegateTo  Entity to which the donation should be delegated
=======
   * @param {string}   amount      Ammount of the donation that is to be delegated - needs to be between 0 and donation amount
   * @param {Object}   delegateTo  Entity to which the donation should be delegated
>>>>>>> Aggregat delegations UI done.
   * @param {function} onCreated   Callback function after the transaction has been broadcasted to chain and stored in feathers
   * @param {function} onSuccess   Callback function after the transaction has been mined
   * @param {function} onError     Callback function after error happened
   */
  static delegate(
    donation,
    amount,
    delegateTo,
    onCreated = () => {},
    onSuccess = () => {},
    onError = () => {},
  ) {
    let txHash;
    let etherScanUrl;
    Promise.all([getNetwork(), getWeb3()])
      .then(([network, web3]) => {
        etherScanUrl = network.etherscan;

        const from =
          donation.delegateId > 0
            ? donation.delegateEntity.ownerAddress
            : donation.ownerEntity.ownerAddress;
        const senderId = donation.delegateId > 0 ? donation.delegateId : donation.ownerId;
        const receiverId = delegateTo.type === 'dac' ? delegateTo.delegateId : delegateTo.projectId;

        const executeTransfer = () => {
          if (donation.ownerType === 'campaign') {
            const contract = new LPPCampaign(web3, donation.ownerEntity.pluginAddress);

            return contract.transfer(donation.pledgeId, amount, receiverId, {
              from,
            });
          }

          return network.liquidPledging.transfer(senderId, donation.pledgeId, amount, receiverId, {
            from,
          }); // need to supply extraGas b/c https://github.com/trufflesuite/ganache-core/issues/26
        };

        return executeTransfer()
          .once('transactionHash', hash => {
            txHash = hash;
            updateExistingDonation(donation, amount);

            const newDonation = {
              txHash,
              amount,
              amountRemaining: amount,
              giverAddress: donation.giverAddress,
              pledgeId: 0,
              parentDonations: [donation.id],
              mined: false,
            };
            // delegate is making the transfer
            if (donation.delegateEntity) {
              Object.assign(newDonation, {
                status: Donation.TO_APPROVE,
                ownerId: donation.ownerId,
                ownerTypeId: donation.ownerTypeId,
                ownerType: donation.ownerType,
                delegateId: donation.delegateId,
                delegateTypeId: donation.delegateTypeId,
                delegateType: donation.delegateType,
                intendedProjectId: delegateTo.projectId, // only support delegating to campaigns/milestones right now
                intendedProjectType: delegateTo.type,
                intendedProjectTypeId: delegateTo.id,
              });
            } else {
              // owner of the donation is making the transfer
              // only support delegating to campaigns/milestones right now
              Object.assign(newDonation, {
                status: Donation.COMMITTED,
                ownerId: delegateTo.projectId,
                ownerTypeId: delegateTo.id,
                ownerType: delegateTo.type,
              });
            }

            feathersClient
              .service('/donations')
              .create(newDonation)
              .then(() => onCreated(`${etherScanUrl}tx/${txHash}`))
              .catch(err => {
                ErrorPopup('Unable to update the donation in feathers', err);
                onError(err);
              });
          })
          .catch(err => {
            if (txHash && err.message && err.message.includes('unknown transaction')) return; // bug in web3 seems to constantly fail due to this error, but the tx is correct
            ErrorPopup(
              'Thare was a problem with the delegation transaction.',
              `${etherScanUrl}tx/${txHash}`,
            );
            onError(err);
          });
      })
      .then(() => onSuccess(`${etherScanUrl}tx/${txHash}`))
      .catch(err => {
        ErrorPopup('Unable to initiate the delegation transaction.', err);
        onError(err);
      });
  }

  /**
   * Reject the delegation of the donation
   *
   * @param {Donation} donation  Donation which delegation should be rejected
   * @param {string}   address   Address of the user who calls reject
   * @param {function} onCreated Callback function after the transaction has been broadcasted to chain and stored in feathers
   * @param {function} onSuccess Callback function after the transaction has been mined
   * @param {function} onError   Callback function after error happened
   */
  static reject(donation, address, onCreated = () => {}, onSuccess = () => {}, onError = () => {}) {
    let txHash;
    let etherScanUrl;
    getNetwork()
      .then(network => {
        etherScanUrl = network.etherscan;

        return network.liquidPledging
          .transfer(
            donation.ownerId,
            donation.pledgeId,
            donation.amountRemaining,
            donation.delegateId,
            {
              from: address,
            },
          )
          .once('transactionHash', hash => {
            txHash = hash;
            updateExistingDonation(donation, donation.amountRemaining, Donation.REJECTED);

            const newDonation = {
              txHash,
              amount: donation.amountRemaining,
              amountRemaining: donation.amountRemaining,
              status: Donation.TO_APPROVE,
              ownerId: donation.ownerId,
              ownerTypeId: donation.ownerTypeId,
              ownerType: donation.ownerType,
              delegateId: donation.delegateId,
              delegateTypeId: donation.delegateTypeId,
              delegateType: donation.delegateType,
              giverAddress: donation.giverAddress,
              pledgeId: 0,
              parentDonations: [donation.id],
              mined: false,
              isReturn: true,
            };

            feathersClient
              .service('/donations')
              .create(newDonation)
              .then(() => {
                onCreated(`${etherScanUrl}tx/${txHash}`);
              })
              .catch(err => {
                ErrorPopup('Something went wrong while committing your donation.', err);
                onError(err);
              });
          });
      })
      .then(() => {
        onSuccess(`${etherScanUrl}tx/${txHash}`);
      })
      .catch(err => {
        if (txHash && err.message && err.message.includes('unknown transaction')) return; // bug in web3 seems to constantly fail due to this error, but the tx is correct
        ErrorPopup(
          'Something went wrong with the transaction. Is your wallet unlocked?',
          txHash ? `${etherScanUrl}tx/${txHash}` : err,
        );
        onError(err);
      });
  }

  /**
   * Commit donation that has been delegated
   *
   * @param {Donation} donation  Donation to be committed
   * @param {string}   address   Address of the user who calls commit
   * @param {function} onCreated Callback function after the transaction has been broadcasted to chain and stored in feathers
   * @param {function} onSuccess Callback function after the transaction has been mined
   * @param {function} onError   Callback function after error happened
   */
  static commit(donation, address, onCreated = () => {}, onSuccess = () => {}, onError = () => {}) {
    let txHash;
    let etherScanUrl;
    getNetwork()
      .then(network => {
        etherScanUrl = network.etherscan;

        return network.liquidPledging
          .transfer(
            donation.ownerId,
            donation.pledgeId,
            donation.amountRemaining,
            donation.intendedProjectId,
            {
              from: address,
            },
          )
          .once('transactionHash', hash => {
            txHash = hash;
            updateExistingDonation(donation, donation.amountRemaining, Donation.COMMITTED);

            const newDonation = {
              txHash,
              amount: donation.amountRemaining,
              amountRemaining: donation.amountRemaining,
              ownerId: donation.intendedProjectId,
              ownerTypeId: donation.intendedProjectTypeId,
              ownerType: donation.intendedProjectType,
              giverAddress: donation.giverAddress,
              pledgeId: 0,
              parentDonations: [donation.id],
              status: Donation.COMMITTED,
              mined: false,
            };
            feathersClient
              .service('/donations')
              .create(newDonation)
              .then(() => {
                onCreated(`${etherScanUrl}tx/${txHash}`);
              })
              .catch(err => {
                ErrorPopup('Something went wrong while committing your donation.', err);
                onError(err);
              });
          });
      })
      .then(() => {
        onSuccess(`${etherScanUrl}tx/${txHash}`);
      })
      .catch(err => {
        if (txHash && err.message && err.message.includes('unknown transaction')) return; // bug in web3 seems to constantly fail due to this error, but the tx is correct
        ErrorPopup(
          'Something went wrong with the transaction. Is your wallet unlocked?',
          `${etherScanUrl}tx/${txHash}`,
        );
        onError(err);
      });
  }

  /**
   * Refund a donation
   *
   * @param {Donation} donation  Donation to be refunded
   * @param {string}   address   Address of the user who calls refund
   * @param {function} onCreated Callback function after the transaction has been broadcasted to chain and stored in feathers
   * @param {function} onSuccess Callback function after the transaction has been mined
   * @param {function} onError   Callback function after error happened
   */
  static refund(donation, address, onCreated = () => {}, onSuccess = () => {}, onError = () => {}) {
    let txHash;
    let etherScanUrl;

    getNetwork()
      .then(network => {
        etherScanUrl = network.etherscan;

        return network.liquidPledging
          .withdraw(donation.pledgeId, donation.amountRemaining, {
            from: address,
          })
          .once('transactionHash', hash => {
            txHash = hash;
            updateExistingDonation(donation, donation.amountRemaining);

            const newDonation = {
              txHash,
              amount: donation.amountRemaining,
              amountRemaining: donation.amountRemaining,
              ownerId: donation.ownerId,
              ownerTypeId: donation.ownerTypeId,
              ownerType: donation.ownerType,
              giverAddress: donation.giverAddress,
              pledgeId: 0,
              parentDonations: [donation.id],
              status: Donation.PAYING,
              mined: false,
            };

            feathersClient
              .service('/donations')
              .create(newDonation)
              .then(() => onCreated(`${etherScanUrl}tx/${txHash}`))
              .catch(err => {
                ErrorPopup('Something went wrong while revoking your donation.', err);
                onError(err);
              });
          });
      })
      .then(() => onSuccess(`${etherScanUrl}tx/${txHash}`))
      .catch(err => {
        if (txHash && err.message && err.message.includes('unknown transaction')) return; // bug in web3 seems to constantly fail due to this error, but the tx is correct
        ErrorPopup(
          'Something went wrong with the transaction. Is your wallet unlocked?',
          `${etherScanUrl}tx/${txHash}`,
        );
        onError(err);
      });
  }

  /**
   * create a new donation instance in feathers
   *
   * @param {User} giver the giver of this donation
   * @param {object} toAdmin entity receiving the donation
   * @param {string} amount donation amount in wei
   * @param {string} txHash transactionHash of the donation tx
   */
  static newFeathersDonation(giver, toAdmin, amount, txHash) {
    const newDonation = {
      giverAddress: giver.address,
      amount,
      amountRemaining: amount,
      pledgeId: 0,
      status: Donation.PENDING,
      homeTxHash: txHash,
      mined: false,
    };

    // donation to a delegate
    if (toAdmin.type === DAC.type) {
      Object.assign(newDonation, {
        ownerType: 'giver',
        ownerTypeId: giver.address,
        ownerId: giver.giverId || 0,
        delegateId: toAdmin.adminId,
        delegateType: toAdmin.type,
        delegateTypeId: toAdmin.id,
      });
    } else {
      Object.assign(newDonation, {
        ownerType: toAdmin.type,
        ownerTypeId: toAdmin.id,
        ownerId: toAdmin.adminId,
      });
    }
    return feathersClient
      .service('donations')
      .create(newDonation)
      .catch(err => {
        ErrorPopup(
          'Your donation has been initiated, however an error occurred when attempting to save. You should see your donation appear within ~30 mins.',
          err,
        );
      });
  }
}

export default DonationService;
