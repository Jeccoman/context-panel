import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Badge,
  Box,
  Button,
  EmptyState,
  Heading,
  Inline,
  Link,
  Lozenge,
  SectionMessage,
  Spinner,
  Stack,
  Strong,
  Tag,
  TagGroup,
  Text,
  User,
  xcss,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const cardStyle = xcss({
  padding: 'space.150',
  borderColor: 'color.border',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderRadius: 'border.radius',
});

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function matchAppearance(match) {
  if (match >= 70) return 'success';
  if (match >= 40) return 'inprogress';
  return 'default';
}

const IssueCard = ({ item, showNote }) => (
  <Box xcss={cardStyle}>
    <Stack space="space.075">
      <Inline space="space.100" alignBlock="center" shouldWrap>
        <Link href={`/browse/${item.key}`}>{item.key}</Link>
        <Lozenge appearance={matchAppearance(item.match)}>{`${item.match}% match`}</Lozenge>
        {item.resolution ? <Lozenge>{item.resolution}</Lozenge> : <Lozenge appearance="moved">{item.status}</Lozenge>}
      </Inline>
      <Text>{item.summary}</Text>
      {showNote && item.lastComment ? (
        <Text>
          <Strong>{`How it ended (${item.lastComment.author}, ${formatDate(item.lastComment.createdAt)}): `}</Strong>
          {item.lastComment.text}
        </Text>
      ) : null}
      <TagGroup>
        {item.sharedComponents.map((c) => (
          <Tag key={`c-${c}`} text={c} color="blueLight" />
        ))}
        {item.sharedTerms.map((t) => (
          <Tag key={`t-${t}`} text={t} />
        ))}
      </TagGroup>
    </Stack>
  </Box>
);

const App = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    invoke('getContext')
      .then(setData)
      .catch(() => setData({ error: 'Could not load context for this issue.' }))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) {
    return (
      <Inline space="space.100" alignBlock="center">
        <Spinner size="small" />
        <Text>Looking through past work…</Text>
      </Inline>
    );
  }

  if (data?.error) {
    return (
      <SectionMessage appearance="error" title="Context unavailable">
        <Text>{data.error}</Text>
        <Button onClick={load}>Try again</Button>
      </SectionMessage>
    );
  }

  const nothing = data.resolved.length === 0 && data.inFlight.length === 0;

  return (
    <Stack space="space.200">
      {data.inFlight.length > 0 ? (
        <SectionMessage appearance="warning" title="Similar work is already open">
          <Stack space="space.100">
            {data.inFlight.map((item) => (
              <Inline key={item.key} space="space.100" alignBlock="center" shouldWrap>
                <Link href={`/browse/${item.key}`}>{item.key}</Link>
                <Text>{item.summary}</Text>
                <Badge>{`${item.match}%`}</Badge>
                {item.assignee ? <User accountId={item.assignee.accountId} /> : <Text>Unassigned</Text>}
              </Inline>
            ))}
          </Stack>
        </SectionMessage>
      ) : null}

      {nothing ? (
        <EmptyState
          header="No related past work found"
          description={`Checked ${data.searchedCount} issues with overlapping terms. This looks new.`}
        />
      ) : null}

      {data.resolved.length > 0 ? (
        <Stack space="space.100">
          <Heading size="small">Solved before</Heading>
          {data.resolved.map((item, i) => (
            <IssueCard key={item.key} item={item} showNote={i < 3} />
          ))}
        </Stack>
      ) : null}

      {data.people.length > 0 ? (
        <Stack space="space.100">
          <Heading size="small">Who knows this area</Heading>
          {data.people.map((p) => (
            <Inline key={p.accountId} space="space.100" alignBlock="center">
              <User accountId={p.accountId} />
              <Text>{`resolved ${p.count} related ${p.count === 1 ? 'issue' : 'issues'}`}</Text>
            </Inline>
          ))}
        </Stack>
      ) : null}

      <Inline space="space.100" alignBlock="center" spread="space-between">
        <Text>{`Ranked from ${data.searchedCount} candidate issues.`}</Text>
        <Button appearance="subtle" onClick={load}>Refresh</Button>
      </Inline>
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
