import React from 'react';
import PropTypes from 'prop-types';
import { truncate } from 'lodash';
import { defineMessages, FormattedMessage, injectIntl } from 'react-intl';

import { ContributionTypes } from '../../lib/constants/contribution-types';
import { TierTypes } from '../../lib/constants/tiers-types';
import { formatCurrency, getPrecisionFromAmount } from '../../lib/currency-utils';
import { isPastEvent } from '../../lib/events';
import { isTierExpired } from '../../lib/tier-utils';
import { capitalize } from '../../lib/utils';

import CollapsableText from '../CollapsableText';
import FormattedMoneyAmount from '../FormattedMoneyAmount';
import { Flex } from '../Grid';
import Link from '../Link';
import StyledLink from '../StyledLink';
import { P } from '../Text';

import Contribute from './Contribute';

const messages = defineMessages({
  fallbackDescription: {
    id: 'TierCard.DefaultDescription',
    defaultMessage:
      '{tierName, select, backer {Become a backer} sponsor {Become a sponsor} other {Join us}}{minAmount, select, 0 {} other { for {minAmountWithCurrency} {interval, select, month {per month} year {per year} other {}}}} and help us sustain our activities!',
  },
});

const getContributionTypeFromTier = (tier, isPassed) => {
  if (isPassed) {
    return ContributionTypes.TIER_PASSED;
  } else if (tier.goal) {
    return ContributionTypes.FINANCIAL_GOAL;
  } else if (tier.type === TierTypes.PRODUCT) {
    return ContributionTypes.PRODUCT;
  } else if (tier.type === TierTypes.TICKET) {
    return ContributionTypes.TICKET;
  } else if (tier.type === TierTypes.MEMBERSHIP) {
    return ContributionTypes.MEMBERSHIP;
  } else if (tier.interval) {
    return ContributionTypes.FINANCIAL_RECURRING;
  } else {
    return ContributionTypes.FINANCIAL_ONE_TIME;
  }
};

const ContributeTier = ({ intl, collective, tier, ...props }) => {
  const currency = tier.currency || collective.currency;
  const isFlexibleAmount = tier.amountType === 'FLEXIBLE';
  const minAmount = isFlexibleAmount ? tier.minimumAmount : tier.amount;
  const raised = tier.interval ? tier.stats.totalRecurringDonations : tier.stats.totalDonated;
  const tierIsExpired = isTierExpired(tier);
  const tierType = getContributionTypeFromTier(tier, tierIsExpired);
  const hasNoneLeft = tier.stats.availableQuantity === 0;
  const canContributeToCollective = collective.isActive && !isPastEvent(collective);
  const isDisabled = !canContributeToCollective || tierIsExpired || hasNoneLeft;

  let description = tier.description;
  if (!tier.description) {
    description = intl.formatMessage(messages.fallbackDescription, {
      minAmount: minAmount || 0,
      tierName: tier.name,
      minAmountWithCurrency: minAmount && formatCurrency(minAmount, currency),
      interval: tier.interval,
    });
  }

  let route, routeParams;
  if (tierType === ContributionTypes.TICKET) {
    route = 'orderEventTier';
    routeParams = {
      collectiveSlug: collective.parentCollective.slug,
      verb: 'events',
      eventSlug: collective.slug,
      tierId: tier.id,
    };
  } else {
    route = 'orderCollectiveTierNew';
    routeParams = { collectiveSlug: collective.slug, verb: 'contribute', tierSlug: tier.slug, tierId: tier.id };
  }

  return (
    <Contribute
      route={route}
      routeParams={routeParams}
      title={capitalize(tier.name)}
      type={tierType}
      buttonText={tier.button}
      contributors={tier.contributors}
      stats={tier.stats.contributors}
      data-cy="contribute-card-tier"
      disableCTA={isDisabled}
      goal={tier.goal}
      amountRaised={raised}
      currency={currency}
      interval={tier.interval}
      {...props}
    >
      <Flex flexDirection="column" justifyContent="space-between" height="100%">
        <div>
          {tier.maxQuantity > 0 && (
            <P fontSize="1.1rem" color="#e69900" textTransform="uppercase" fontWeight="500" letterSpacing="1px" mb={2}>
              <FormattedMessage
                id="tier.limited"
                values={{
                  maxQuantity: tier.maxQuantity,
                  availableQuantity: tier.stats && tier.stats.availableQuantity,
                }}
                defaultMessage="LIMITED: {availableQuantity} LEFT OUT OF {maxQuantity}"
              />
            </P>
          )}
          <P mb={4} lineHeight="22px">
            {tier.useStandalonePage ? (
              <React.Fragment>
                {truncate(description, { length: 150 })}{' '}
                <StyledLink
                  as={Link}
                  whiteSpace="nowrap"
                  route="tier"
                  params={{
                    collectiveSlug: collective.slug,
                    verb: 'contribute',
                    tierSlug: tier.slug,
                    tierId: tier.id,
                  }}
                >
                  <FormattedMessage id="ContributeCard.ReadMore" defaultMessage="Read more" />
                </StyledLink>
              </React.Fragment>
            ) : (
              <CollapsableText text={description} maxLength={150} />
            )}
          </P>
        </div>
        {!isDisabled && minAmount > 0 && (
          <div>
            {isFlexibleAmount && (
              <P fontSize="10px" color="black.600" textTransform="uppercase" mb={1}>
                <FormattedMessage id="ContributeTier.StartsAt" defaultMessage="Starts at" />
              </P>
            )}
            <P color="black.700" data-cy="amount">
              <FormattedMoneyAmount
                amount={minAmount}
                interval={tier.interval}
                currency={currency}
                amountStyles={{ fontSize: '20px', fontWeight: 'bold', color: 'black.900' }}
                precision={getPrecisionFromAmount(minAmount)}
              />
            </P>
          </div>
        )}
      </Flex>
    </Contribute>
  );
};

ContributeTier.propTypes = {
  collective: PropTypes.shape({
    slug: PropTypes.string.isRequired,
    currency: PropTypes.string.isRequired,
    isActive: PropTypes.bool,
    parentCollective: PropTypes.shape({
      slug: PropTypes.string.isRequired,
    }),
  }),
  tier: PropTypes.shape({
    id: PropTypes.number.isRequired,
    slug: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    currency: PropTypes.string,
    useStandalonePage: PropTypes.bool,
    interval: PropTypes.string,
    amountType: PropTypes.string,
    endsAt: PropTypes.string,
    button: PropTypes.string,
    goal: PropTypes.number,
    minimumAmount: PropTypes.number,
    amount: PropTypes.number,
    maxQuantity: PropTypes.number,
    stats: PropTypes.shape({
      totalRecurringDonations: PropTypes.number,
      totalDonated: PropTypes.number,
      contributors: PropTypes.object,
      availableQuantity: PropTypes.number,
    }).isRequired,
    contributors: PropTypes.arrayOf(PropTypes.object),
  }),
  /** @ignore */
  intl: PropTypes.object.isRequired,
};

export default injectIntl(ContributeTier);
