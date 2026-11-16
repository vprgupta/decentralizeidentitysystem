import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOTAL_WALKTHROUGH_DURATION_MS,
  WALKTHROUGH_SCENES,
  clampPlaybackTime,
  formatTimecode,
  getOverallProgressPercent,
  getSceneAtTime,
  getSceneLocalProgress,
} from './walkthroughTimeline';

test('walkthrough scenes are contiguous from 0 to TOTAL_WALKTHROUGH_DURATION_MS', () => {
  assert.equal(WALKTHROUGH_SCENES.length, 6);
  assert.equal(WALKTHROUGH_SCENES[0].startMs, 0);
  for (let i = 1; i < WALKTHROUGH_SCENES.length; i++) {
    assert.equal(
      WALKTHROUGH_SCENES[i].startMs,
      WALKTHROUGH_SCENES[i - 1].endMs
    );
  }
  assert.equal(
    WALKTHROUGH_SCENES[WALKTHROUGH_SCENES.length - 1].endMs,
    TOTAL_WALKTHROUGH_DURATION_MS
  );
});

test('getSceneAtTime selects correct scene across boundaries', () => {
  assert.equal(getSceneAtTime(-500).stepNumber, '01');
  assert.equal(getSceneAtTime(0).stepNumber, '01');
  assert.equal(getSceneAtTime(5999).stepNumber, '01');
  assert.equal(getSceneAtTime(6000).stepNumber, '02');
  assert.equal(getSceneAtTime(18500).stepNumber, '04');
  assert.equal(getSceneAtTime(36000).stepNumber, '06');
  assert.equal(getSceneAtTime(999999).stepNumber, '06');
});

test('clampPlaybackTime, local progress, and formatTimecode compute accurately', () => {
  assert.equal(clampPlaybackTime(-100), 0);
  assert.equal(clampPlaybackTime(TOTAL_WALKTHROUGH_DURATION_MS + 500), TOTAL_WALKTHROUGH_DURATION_MS);
  assert.equal(getSceneLocalProgress(3000), 0.5);
  assert.equal(getSceneLocalProgress(9000), 0.5);
  assert.equal(getOverallProgressPercent(18000), 50);
  assert.equal(formatTimecode(0), '00:00');
  assert.equal(formatTimecode(14900), '00:14');
  assert.equal(formatTimecode(36000), '00:36');
});
