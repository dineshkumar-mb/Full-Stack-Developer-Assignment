import { Question } from '../models/Question.js';

export const SEED_QUESTIONS = [
  // 1. Quantitative (Sample 1)
  {
    seedId: 'SEED_Q_QUANT_01',
    category: 'Quantitative',
    difficulty: 'Medium',
    questionText:
      "A subscription business plans a 20% price increase. What is the largest share of its customers it can lose before monthly revenue falls below today's level?",
    options: [
      { optionId: 'A', text: '16.7%' },
      { optionId: 'B', text: '20%' },
      { optionId: 'C', text: '15%' },
      { optionId: 'D', text: '18.3%' },
    ],
    correctOption: 'A',
    explanation:
      "Let today's price be P and customer volume be C. Baseline revenue = P * C. After a 20% increase, the new price is 1.20P. To maintain at least baseline revenue: 1.20P * C_new >= P * C => C_new / C >= 1 / 1.20 = 5/6 ≈ 83.33%. Therefore, the maximum allowable customer churn is 1 - 0.8333 = 16.67% (≈ 16.7%).",
    isActive: true,
  },
  // 2. Logical Reasoning (Sample 2)
  {
    seedId: 'SEED_Q_LOGIC_01',
    category: 'Logical Reasoning',
    difficulty: 'Hard',
    questionText:
      'Six client meetings (P, Q, R, S, T, U) are scheduled Monday to Saturday, one per day. S is on Wednesday. R is the day immediately before U, and U is not on Saturday. Q is later in the week than both P and T. T is not on Monday. Which of the following must be true?',
    options: [
      { optionId: 'A', text: 'P is on Monday' },
      { optionId: 'B', text: 'Q is on Saturday' },
      { optionId: 'C', text: 'R is on Thursday' },
      { optionId: 'D', text: 'T is on Tuesday' },
    ],
    correctOption: 'B',
    explanation:
      'Schedule: Mon-Sat. S=Wed. The consecutive pair RU cannot cross Wed and U cannot be Sat, so RU is either (Mon, Tue) or (Thu, Fri). In Case 1 (RU=Mon-Tue), remaining days are Thu, Fri, Sat for P, T, Q. Since Q is later than both P and T, Q must be on Saturday. In Case 2 (RU=Thu-Fri), remaining days are Mon, Tue, Sat. Since T cannot be Monday, P must be Monday, T must be Tuesday, and Q must be Saturday. In all valid assignments, Q must be on Saturday.',
    isActive: true,
  },
  // 3. Verbal (Sample 3)
  {
    seedId: 'SEED_Q_VERBAL_01',
    category: 'Verbal',
    difficulty: 'Medium',
    questionText: 'Choose the grammatically correct sentence for a corporate project update.',
    options: [
      { optionId: 'A', text: 'Neither the manager nor the analysts was aware of the change.' },
      { optionId: 'B', text: 'Neither the analysts nor the manager were aware of the change.' },
      { optionId: 'C', text: 'Neither the manager nor the analysts were aware of the change.' },
      { optionId: 'D', text: 'Neither the manager or the analysts were aware of the change.' },
    ],
    correctOption: 'C',
    explanation:
      "Under the rule of proximity with correlative conjunctions ('neither...nor'), the verb agrees with the subject closest to it. Here, 'analysts' is plural and adjacent to the verb, requiring the plural verb 'were'. In (A), 'analysts' is incorrectly paired with singular 'was'. In (B), singular 'manager' is paired with plural 'were'. In (D), 'neither...or' is an invalid correlative pair.",
    isActive: true,
  },
  // 4. Quantitative (Original 1)
  {
    seedId: 'SEED_Q_QUANT_02',
    category: 'Quantitative',
    difficulty: 'Easy',
    questionText:
      'A SaaS company has a Customer Acquisition Cost (CAC) of $600 and an average monthly revenue per user (ARPU) of $80 with a gross profit margin of 75%. How many months of continuous subscription does it take for a newly acquired customer to break even on acquisition cost?',
    options: [
      { optionId: 'A', text: '8 months' },
      { optionId: 'B', text: '10 months' },
      { optionId: 'C', text: '12 months' },
      { optionId: 'D', text: '7.5 months' },
    ],
    correctOption: 'B',
    explanation:
      'Step 1: Calculate monthly gross profit contribution per customer = $80 * 0.75 = $60/month. Step 2: Payback period = CAC / Monthly Gross Profit = $600 / $60 = 10 months.',
    isActive: true,
  },
  // 5. Quantitative (Original 2)
  {
    seedId: 'SEED_Q_QUANT_03',
    category: 'Quantitative',
    difficulty: 'Medium',
    questionText:
      'A project team of 8 senior consultants can complete a data migration audit in 15 business days. After working together for 3 days, 2 senior consultants are reassigned to an urgent production outage. If the remaining consultants work at the same pace, how many additional business days will they need to finish the audit?',
    options: [
      { optionId: 'A', text: '14 days' },
      { optionId: 'B', text: '16 days' },
      { optionId: 'C', text: '18 days' },
      { optionId: 'D', text: '15 days' },
    ],
    correctOption: 'B',
    explanation:
      'Total workload = 8 * 15 = 120 consultant-days. Work done in first 3 days = 8 * 3 = 24 consultant-days. Remaining work = 120 - 24 = 96 consultant-days. Remaining team size = 8 - 2 = 6 consultants. Additional days required = 96 / 6 = 16 days.',
    isActive: true,
  },
  // 6. Quantitative (Original 3)
  {
    seedId: 'SEED_Q_QUANT_04',
    category: 'Quantitative',
    difficulty: 'Hard',
    questionText:
      "Division Alpha and Division Beta generated combined revenues of $20 million in 2024. In 2025, Division Alpha increased its revenue by 20% while Division Beta's revenue decreased by 15%, resulting in a combined revenue of $21.2 million. What was Division Alpha's revenue in 2024?",
    options: [
      { optionId: 'A', text: '$10.0 million' },
      { optionId: 'B', text: '$12.0 million' },
      { optionId: 'C', text: '$14.0 million' },
      { optionId: 'D', text: '$15.0 million' },
    ],
    correctOption: 'B',
    explanation:
      "Let Alpha's 2024 revenue be A and Beta's be B. (1) A + B = 20 => B = 20 - A. (2) 1.20A + 0.85B = 21.2. Substitute B: 1.20A + 0.85(20 - A) = 21.2 => 1.20A + 17 - 0.85A = 21.2 => 0.35A = 4.2 => A = 4.2 / 0.35 = $12.0 million.",
    isActive: true,
  },
  // 7. Logical Reasoning (Original 1)
  {
    seedId: 'SEED_Q_LOGIC_02',
    category: 'Logical Reasoning',
    difficulty: 'Easy',
    questionText:
      'All high-performing enterprise accounts are assigned a dedicated Solution Architect. No account with overdue compliance documentation is assigned a dedicated Solution Architect. Account Helios has overdue compliance documentation. Which of the following conclusions logically follows?',
    options: [
      { optionId: 'A', text: 'Account Helios is not a high-performing enterprise account.' },
      { optionId: 'B', text: 'Account Helios will receive a Solution Architect once compliance is reviewed.' },
      { optionId: 'C', text: 'Some high-performing enterprise accounts have overdue compliance documentation.' },
      { optionId: 'D', text: 'Account Helios is an underperforming consumer account.' },
    ],
    correctOption: 'A',
    explanation:
      'Premise 1: High-Performing -> Architect. Premise 2: Overdue Documentation -> No Architect (contrapositive: Architect -> No Overdue Documentation). Combining: High-Performing -> No Overdue Documentation. Fact: Helios has Overdue Documentation. By Modus Tollens, Helios cannot be a High-Performing account.',
    isActive: true,
  },
  // 8. Logical Reasoning (Original 2)
  {
    seedId: 'SEED_Q_LOGIC_03',
    category: 'Logical Reasoning',
    difficulty: 'Medium',
    questionText:
      'Five enterprise modules—Billing, CRM, Inventory, Analytics, and Notifications—must be deployed sequentially during a system upgrade. Billing must be deployed before CRM. CRM must be deployed before Inventory. Analytics must be deployed immediately after Inventory. Notifications is deployed fifth. Which module is deployed second?',
    options: [
      { optionId: 'A', text: 'Billing' },
      { optionId: 'B', text: 'CRM' },
      { optionId: 'C', text: 'Inventory' },
      { optionId: 'D', text: 'Analytics' },
    ],
    correctOption: 'B',
    explanation:
      'Notifications is fifth (slot 5). Slots 1-4 remain for Billing, CRM, Inventory, Analytics. Billing precedes CRM, CRM precedes Inventory, and Analytics is immediately after Inventory. The unique sequence fitting all conditions is: 1: Billing, 2: CRM, 3: Inventory, 4: Analytics, 5: Notifications. Module deployed second is CRM.',
    isActive: true,
  },
  // 9. Verbal (Original 1)
  {
    seedId: 'SEED_Q_VERBAL_02',
    category: 'Verbal',
    difficulty: 'Easy',
    questionText:
      'Identify the sentence that observes correct parallel structure in a professional performance review.',
    options: [
      { optionId: 'A', text: 'The lead analyst is responsible for auditing system logs, designing test cases, and to oversee junior developers.' },
      { optionId: 'B', text: 'The lead analyst is responsible for auditing system logs, the design of test cases, and overseeing junior developers.' },
      { optionId: 'C', text: 'The lead analyst is responsible for auditing system logs, designing test cases, and overseeing junior developers.' },
      { optionId: 'D', text: 'The lead analyst is responsible to audit system logs, designing test cases, and oversees junior developers.' },
    ],
    correctOption: 'C',
    explanation:
      "Parallel structure requires all elements in a series to share the same grammatical form. Option (C) coordinates three gerund phrases ('auditing system logs', 'designing test cases', 'overseeing junior developers').",
    isActive: true,
  },
  // 10. Verbal (Original 2)
  {
    seedId: 'SEED_Q_VERBAL_03',
    category: 'Verbal',
    difficulty: 'Hard',
    questionText:
      'Select the sentence that most precisely conveys the recommendation without redundancy or syntactic ambiguity.',
    options: [
      { optionId: 'A', text: 'In spite of the fact that the initial pilot phase encountered unforeseen delays, the steering committee decided to proceed ahead with the enterprise rollout plan.' },
      { optionId: 'B', text: 'Although the initial pilot encountered unexpected delays, the steering committee decided to proceed with the enterprise rollout.' },
      { optionId: 'C', text: 'Due to the unforeseen delays occurring during the initial pilot, the committee decided to proactively proceed forwards anyway.' },
      { optionId: 'D', text: 'Despite having encountered unforeseen delays in the initial pilot first, the steering committee made a decision to proceed ahead with rollout.' },
    ],
    correctOption: 'B',
    explanation:
      "Option (B) provides clean, concise prose. Option (A) contains wordy filler ('In spite of the fact that') and redundancy ('proceed ahead'). (C) and (D) include tautologies ('proceed forwards', 'proceed ahead first').",
    isActive: true,
  },
];

export const seedQuestions = async () => {
  try {
    for (let i = 0; i < SEED_QUESTIONS.length; i++) {
      const q = SEED_QUESTIONS[i];
      await Question.findOneAndUpdate(
        { seedId: q.seedId },
        { $set: { ...q, activeSlot: i + 1 } },
        { upsert: true, new: true, runValidators: true }
      );
    }

    // Verify active questions count and category breakdown
    const activeQuestions = await Question.find({ isActive: true });
    const count = activeQuestions.length;

    const breakdown = activeQuestions.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    }, {});

    console.log(`[Seed:Questions] Seeded questions successfully. Active questions: ${count}`);
    console.log(`[Seed:Questions] Category distribution: Quantitative=${breakdown['Quantitative'] || 0}, Logical Reasoning=${breakdown['Logical Reasoning'] || 0}, Verbal=${breakdown['Verbal'] || 0}`);

    if (count !== 10) {
      throw new Error(`Expected exactly 10 active questions, but found ${count}`);
    }

    if (
      breakdown['Quantitative'] !== 4 ||
      breakdown['Logical Reasoning'] !== 3 ||
      breakdown['Verbal'] !== 3
    ) {
      throw new Error('Question category distribution must be 4 Quantitative, 3 Logical Reasoning, 3 Verbal');
    }

    return activeQuestions;
  } catch (error) {
    console.error(`[Seed:Questions Error] Failed to seed questions: ${error.message}`);
    throw error;
  }
};

// Direct script execution
if (process.argv[1]?.endsWith('seedQuestions.js')) {
  import('../config/database.js').then(async ({ connectDB, disconnectDB }) => {
    try {
      await connectDB();
      await seedQuestions();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
}

export default seedQuestions;
