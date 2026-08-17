// discord's nitro pink, the colour of the boost bar and the boost gem
const BOOST_COLOR = 0xff73fa;
const JOIN_COLOR = 0x5865f2;

const count = (value) => value.toLocaleString('en-US');

const author = ({ displayName, avatarUrl, userId }) => ({
  name: displayName,
  icon_url: avatarUrl,
  url: `https://discord.com/users/${userId}`
});

const describe = (sentence, subtext) => (subtext ? `${sentence}\n-# ${subtext}` : sentence);

export const welcomeEmbed = ({ displayName, avatarUrl, userId, memberCount }) => ({
  color: JOIN_COLOR,
  author: author({ displayName, avatarUrl, userId }),
  description: describe(
    'just joined the server!',
    memberCount ? `Member #${count(memberCount)}` : ''
  )
});

export const boostEmbed = ({ displayName, avatarUrl, userId, boostCount, tier }) => {
  const detail = [];

  if (boostCount) {
    detail.push(`${count(boostCount)} boost${boostCount === 1 ? '' : 's'}`);
  }

  if (tier) {
    detail.push(`Level ${tier}`);
  }

  return {
    color: BOOST_COLOR,
    author: author({ displayName, avatarUrl, userId }),
    description: describe(
      'just boosted the server!',
      detail.length ? `The server is now at ${detail.join(', ')}` : ''
    )
  };
};
