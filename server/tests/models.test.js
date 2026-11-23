import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { Admin } from '../models/Admin.js';
import { Candidate } from '../models/Candidate.js';
import { Question } from '../models/Question.js';
import { Settings } from '../models/Settings.js';
import { Attempt } from '../models/Attempt.js';

describe('1. Admin Model Validation & Features', () => {
  it('should create an admin with valid attributes and exclude passwordHash in toJSON', async () => {
    const admin = await Admin.create({
      name: 'System Admin',
      email: 'Admin@Assessment.COM',
      passwordHash: '$2a$12$fakehashedpasswordfortestvalidation',
      role: 'admin',
    });

    expect(admin._id).toBeDefined();
    // Test 3: Email normalization
    expect(admin.email).toBe('admin@assessment.com');

    // Test passwordHash excluded in JSON representation
    const json = admin.toJSON();
    expect(json.passwordHash).toBeUndefined();
    expect(json.name).toBe('System Admin');
  });

  it('should fail validation when name is shorter than 2 characters', async () => {
    await expect(
      Admin.create({
        name: 'A',
        email: 'valid@example.com',
        passwordHash: 'hash',
      })
    ).rejects.toThrow();
  });

  // Test 4: Duplicate email index for Admin
  it('should enforce unique email index on Admin collection', async () => {
    await Admin.create({
      name: 'Admin One',
      email: 'duplicate@test.com',
      passwordHash: 'hash1',
    });

    await expect(
      Admin.create({
        name: 'Admin Two',
        email: 'duplicate@test.com',
        passwordHash: 'hash2',
      })
    ).rejects.toThrow();
  });
});

describe('2. Candidate Model Validation', () => {
  it('should validate candidate details and normalize email', async () => {
    const candidate = await Candidate.create({
      fullName: 'Jane Doe',
      email: ' Jane.Doe@Example.COM ',
      age: 24,
      phoneNumber: '9876543210',
      highestQualification: "Bachelor's Degree",
      gender: 'Female',
      city: 'Bangalore',
    });

    expect(candidate.email).toBe('jane.doe@example.com');
    expect(candidate.age).toBe(24);
  });

  it('should reject invalid full names with special characters or numbers', async () => {
    await expect(
      Candidate.create({
        fullName: 'Jane Doe 123!',
        email: 'jane123@example.com',
        age: 24,
        phoneNumber: '9876543210',
        highestQualification: "Bachelor's Degree",
      })
    ).rejects.toThrow();
  });

  it('should reject candidates younger than 18 or older than 60', async () => {
    await expect(
      Candidate.create({
        fullName: 'Young Candidate',
        email: 'young@example.com',
        age: 17,
        phoneNumber: '9876543210',
        highestQualification: 'High School',
      })
    ).rejects.toThrow();

    await expect(
      Candidate.create({
        fullName: 'Older Candidate',
        email: 'older@example.com',
        age: 61,
        phoneNumber: '9876543210',
        highestQualification: 'Master\'s Degree',
      })
    ).rejects.toThrow();
  });

  it('should enforce unique candidate email index', async () => {
    await Candidate.create({
      fullName: 'First Candidate',
      email: 'unique.candidate@test.com',
      age: 25,
      phoneNumber: '9123456789',
      highestQualification: "Bachelor's Degree",
    });

    await expect(
      Candidate.create({
        fullName: 'Second Candidate',
        email: 'unique.candidate@test.com',
        age: 28,
        phoneNumber: '9988776655',
        highestQualification: 'Master\'s Degree',
      })
    ).rejects.toThrow();
  });
});

describe('3. Question Model Validation & Active Limit Invariant', () => {
  const validOptions = [
    { optionId: 'A', text: 'Option A' },
    { optionId: 'B', text: 'Option B' },
    { optionId: 'C', text: 'Option C' },
    { optionId: 'D', text: 'Option D' },
  ];

  it('should create question with exactly 4 options and valid correctOption', async () => {
    const question = await Question.create({
      questionText: 'What is the corporate revenue target for next quarter?',
      options: validOptions,
      correctOption: 'B',
      category: 'Quantitative',
      difficulty: 'Medium',
    });

    expect(question._id).toBeDefined();
    expect(question.options.length).toBe(4);
    expect(question.correctOption).toBe('B');
  });

  // Test 5: Question option validation
  it('should reject question when options do not cover A, B, C, D', async () => {
    const invalidOptions = [
      { optionId: 'A', text: 'First' },
      { optionId: 'B', text: 'Second' },
      { optionId: 'A', text: 'Duplicate A' },
      { optionId: 'D', text: 'Fourth' },
    ];

    await expect(
      Question.create({
        questionText: 'Sample invalid options question text here',
        options: invalidOptions,
        correctOption: 'B',
        category: 'Logical Reasoning',
        difficulty: 'Easy',
      })
    ).rejects.toThrow();
  });

  // Test 6: Correct answer validation
  it('should reject question when correctOption does not match any optionId', async () => {
    await expect(
      Question.create({
        questionText: 'Another sample question text for testing',
        options: validOptions,
        correctOption: 'E', // invalid
        category: 'Verbal',
        difficulty: 'Hard',
      })
    ).rejects.toThrow();
  });

  // Test 15: Active question limit (Maximum 10 active questions)
  it('should enforce maximum 10 active questions invariant', async () => {
    // Insert 10 active questions
    for (let i = 1; i <= 10; i++) {
      await Question.create({
        seedId: `TEST_Q_${i}`,
        questionText: `Valid test question number ${i} with sufficient text length`,
        options: validOptions,
        correctOption: 'A',
        category: 'Quantitative',
        difficulty: 'Easy',
        isActive: true,
      });
    }

    const activeCount = await Question.countDocuments({ isActive: true });
    expect(activeCount).toBe(10);

    // Attempting to create an 11th active question should throw an error
    await expect(
      Question.create({
        seedId: 'TEST_Q_11_OVERFLOW',
        questionText: 'Attempting to create eleventh active question text',
        options: validOptions,
        correctOption: 'C',
        category: 'Verbal',
        difficulty: 'Medium',
        isActive: true,
      })
    ).rejects.toThrow(/Maximum 10 active questions/);

    // Creating an inactive 11th question should succeed
    const inactiveQuestion = await Question.create({
      seedId: 'TEST_Q_11_INACTIVE',
      questionText: 'Inactive eleventh question text with valid length',
      options: validOptions,
      correctOption: 'C',
      category: 'Verbal',
      difficulty: 'Medium',
      isActive: false,
    });
    expect(inactiveQuestion._id).toBeDefined();
  });
});

describe('4. Settings Model Defaults & Singleton Pattern', () => {
  // Test 7: Settings defaults
  it('should initialize settings with specified defaults', async () => {
    const settings = await Settings.getSettings();

    expect(settings.testDurationMinutes).toBe(15);
    expect(settings.passPercentage).toBe(60);
    expect(settings.correctMarkWeight).toBe(2);
    expect(settings.negativeMarkWeight).toBe(1);
    expect(settings.totalTestQuestions).toBe(10);
    expect(settings.singletonKey).toBe('GLOBAL_SETTINGS');
  });

  it('should enforce single global settings document through singletonKey', async () => {
    await Settings.getSettings();

    await expect(
      Settings.create({
        singletonKey: 'GLOBAL_SETTINGS',
        testDurationMinutes: 20,
        passPercentage: 75,
      })
    ).rejects.toThrow();
  });
});

describe('5. Attempt Model Schema Validation', () => {
  // Test 8: Attempt schema validation
  it('should require exactly 10 question snapshots in an attempt', async () => {
    const candidateId = new mongoose.Types.ObjectId();
    const candidateEmail = 'candidate.attempt@test.com';

    // 9 snapshots (invalid)
    const snapshots9 = Array.from({ length: 9 }, (_, i) => ({
      questionId: new mongoose.Types.ObjectId(),
      orderNumber: i + 1,
      questionText: `Question ${i + 1} text`,
      options: [
        { optionId: 'A', text: '1' },
        { optionId: 'B', text: '2' },
        { optionId: 'C', text: '3' },
        { optionId: 'D', text: '4' },
      ],
      correctOption: 'A',
      category: 'Quantitative',
      difficulty: 'Easy',
    }));

    await expect(
      Attempt.create({
        candidateId,
        candidateEmail,
        candidateSnapshot: { name: 'Test' },
        expiresAt: new Date(Date.now() + 15 * 60000),
        questionSnapshots: snapshots9,
        settingsSnapshot: { testDurationMinutes: 15 },
      })
    ).rejects.toThrow(/Assessment attempt must contain exactly 10 question snapshots/);

    // 10 snapshots (valid)
    const snapshots10 = [
      ...snapshots9,
      {
        questionId: new mongoose.Types.ObjectId(),
        orderNumber: 10,
        questionText: 'Question 10 text',
        options: [
          { optionId: 'A', text: '1' },
          { optionId: 'B', text: '2' },
          { optionId: 'C', text: '3' },
          { optionId: 'D', text: '4' },
        ],
        correctOption: 'C',
        category: 'Verbal',
        difficulty: 'Medium',
      },
    ];

    const validAttempt = await Attempt.create({
      candidateId,
      candidateEmail,
      candidateSnapshot: { name: 'Test' },
      expiresAt: new Date(Date.now() + 15 * 60000),
      questionSnapshots: snapshots10,
      settingsSnapshot: { testDurationMinutes: 15 },
    });

    expect(validAttempt._id).toBeDefined();
    expect(validAttempt.questionSnapshots.length).toBe(10);
    expect(validAttempt.status).toBe('in_progress');
  });
});
