#!/usr/bin/env node
/**
 * validate_items.js — checks an IQ quiz item bank against the iq-quiz-builder schema.
 * Why: item banks are hand-authored JSON; this catches broken keys, duplicate ids,
 * malformed option counts, and bad difficulty ordering before an item ever ships.
 *
 * Usage: node validate_items.js <path-to-bank.json>
 * Exit code: 0 if the bank is valid, 1 if any check fails.
 */

const fs = require('fs');
const path = require('path');

const MIN_OPTIONS = 4;
const MAX_OPTIONS = 6;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;

function fail(errors, msg) {
  errors.push(msg);
}

function validateBank(bank) {
  const errors = [];

  if (!Array.isArray(bank)) {
    return ['Bank root must be a JSON array of items.'];
  }
  if (bank.length === 0) {
    return ['Bank is empty — add at least one item.'];
  }

  const seenIds = new Set();
  let lastDifficulty = -Infinity;

  bank.forEach((item, index) => {
    const label = `Item #${index + 1} (id: ${item && item.id ? item.id : 'MISSING'})`;

    if (!item || typeof item !== 'object') {
      fail(errors, `${label}: item is not an object.`);
      return;
    }

    // id: non-empty string, unique
    if (typeof item.id !== 'string' || item.id.trim() === '') {
      fail(errors, `${label}: missing or empty "id".`);
    } else if (seenIds.has(item.id)) {
      fail(errors, `${label}: duplicate id "${item.id}".`);
    } else {
      seenIds.add(item.id);
    }

    // type / prompt: non-empty strings
    if (typeof item.type !== 'string' || item.type.trim() === '') {
      fail(errors, `${label}: missing or empty "type".`);
    }
    if (typeof item.prompt !== 'string' || item.prompt.trim() === '') {
      fail(errors, `${label}: missing or empty "prompt".`);
    }

    // difficulty: integer 1-5
    if (
      typeof item.difficulty !== 'number' ||
      !Number.isInteger(item.difficulty) ||
      item.difficulty < MIN_DIFFICULTY ||
      item.difficulty > MAX_DIFFICULTY
    ) {
      fail(
        errors,
        `${label}: "difficulty" must be an integer between ${MIN_DIFFICULTY} and ${MAX_DIFFICULTY}.`
      );
    } else {
      if (item.difficulty < lastDifficulty) {
        fail(
          errors,
          `${label}: bank is not ordered by ascending difficulty (found ${item.difficulty} after ${lastDifficulty}).`
        );
      }
      lastDifficulty = item.difficulty;
    }

    // options: 4-6, exactly one correct
    if (!Array.isArray(item.options)) {
      fail(errors, `${label}: "options" must be an array.`);
    } else {
      if (item.options.length < MIN_OPTIONS || item.options.length > MAX_OPTIONS) {
        fail(
          errors,
          `${label}: must have between ${MIN_OPTIONS} and ${MAX_OPTIONS} options (found ${item.options.length}).`
        );
      }
      const correctCount = item.options.filter((o) => o && o.correct === true).length;
      if (correctCount !== 1) {
        fail(
          errors,
          `${label}: must have exactly one option with "correct": true (found ${correctCount}).`
        );
      }
      item.options.forEach((opt, optIndex) => {
        if (!opt || (typeof opt.text !== 'string' && typeof opt.svg !== 'string')) {
          fail(errors, `${label}: option #${optIndex + 1} needs a "text" or "svg" value.`);
        }
      });
    }
  });

  return errors;
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: node validate_items.js <path-to-bank.json>');
    process.exit(1);
  }

  const resolvedPath = path.resolve(inputPath);
  let raw;
  try {
    raw = fs.readFileSync(resolvedPath, 'utf8');
  } catch (e) {
    console.error(`Could not read file: ${resolvedPath}`);
    process.exit(1);
  }

  let bank;
  try {
    bank = JSON.parse(raw);
  } catch (e) {
    console.error(`Invalid JSON in ${resolvedPath}: ${e.message}`);
    process.exit(1);
  }

  const errors = validateBank(bank);

  console.log(`Validating ${resolvedPath} (${Array.isArray(bank) ? bank.length : 0} items)`);
  if (errors.length === 0) {
    console.log('PASS — all items valid, bank ordered by ascending difficulty.');
    process.exit(0);
  }

  console.log(`FAIL — ${errors.length} issue(s):`);
  errors.forEach((e) => console.log(`  - ${e}`));
  process.exit(1);
}

main();
