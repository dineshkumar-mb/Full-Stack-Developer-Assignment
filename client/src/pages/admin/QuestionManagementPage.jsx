import React, { useState, useEffect, useCallback } from 'react';
import adminService from '../../services/adminService.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Select from '../../components/common/Select.jsx';
import Badge from '../../components/common/Badge.jsx';
import Alert from '../../components/common/Alert.jsx';
import Modal from '../../components/common/Modal.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import {
  HelpCircle,
  Plus,
  ArrowRightLeft,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

const categoryOptions = [
  { value: 'Quantitative', label: 'Quantitative' },
  { value: 'Logical Reasoning', label: 'Logical Reasoning' },
  { value: 'Verbal', label: 'Verbal' },
];

const difficultyOptions = [
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
];

export function QuestionManagementPage() {
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    questionText: '',
    category: 'Quantitative',
    difficulty: 'Medium',
    correctOption: 'A',
    options: [
      { optionId: 'A', text: '' },
      { optionId: 'B', text: '' },
      { optionId: 'C', text: '' },
      { optionId: 'D', text: '' },
    ],
    explanation: '',
    isActive: false,
  });

  const [replacementQuestionId, setReplacementQuestionId] = useState('');
  const [inactiveQuestions, setInactiveQuestions] = useState([]);

  const fetchQuestions = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = { page, limit: 15 };
        if (search) params.search = search;
        if (categoryFilter) params.category = categoryFilter;
        if (difficultyFilter) params.difficulty = difficultyFilter;
        if (statusFilter !== '') params.isActive = statusFilter === 'active';

        const response = await adminService.getQuestions(params);
        setQuestions(response.data.questions);
        setPagination(
          response.data.pagination || {
            page: 1,
            totalPages: 1,
            total: response.data.questions.length,
          }
        );
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load question bank.');
      } finally {
        setIsLoading(false);
      }
    },
    [search, categoryFilter, difficultyFilter, statusFilter]
  );

  useEffect(() => {
    fetchQuestions(1);
  }, [fetchQuestions]);

  // Load inactive questions for the atomic swap modal
  const openSwapModal = async (activeQ) => {
    setSelectedQuestion(activeQ);
    setReplacementQuestionId('');
    setError(null);
    try {
      const res = await adminService.getQuestions({ isActive: false, limit: 50 });
      setInactiveQuestions(res.data.questions || []);
      setIsSwapOpen(true);
    } catch {
      setError('Unable to fetch available inactive questions for swap.');
    }
  };

  const handleOpenCreate = () => {
    setFormData({
      questionText: '',
      category: 'Quantitative',
      difficulty: 'Medium',
      correctOption: 'A',
      options: [
        { optionId: 'A', text: '' },
        { optionId: 'B', text: '' },
        { optionId: 'C', text: '' },
        { optionId: 'D', text: '' },
      ],
      explanation: '',
      isActive: false,
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (q) => {
    setSelectedQuestion(q);
    setFormData({
      questionText: q.questionText,
      category: q.category,
      difficulty: q.difficulty,
      correctOption: q.correctOption,
      options: q.options.map((opt) => ({ optionId: opt.optionId, text: opt.text })),
      explanation: q.explanation || '',
      isActive: q.isActive,
    });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (q) => {
    setSelectedQuestion(q);
    setIsDeleteOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await adminService.createQuestion(formData);
      setIsCreateOpen(false);
      setSuccessMessage('Question added to the repository successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchQuestions(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create question.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await adminService.updateQuestion(selectedQuestion._id || selectedQuestion.id, {
        questionText: formData.questionText,
        category: formData.category,
        difficulty: formData.difficulty,
        correctOption: formData.correctOption,
        options: formData.options,
        explanation: formData.explanation,
      });
      setIsEditOpen(false);
      setSuccessMessage('Question updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchQuestions(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update question.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwapSubmit = async (e) => {
    e.preventDefault();
    if (!replacementQuestionId) {
      setError('Please select an inactive replacement question.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const qId = selectedQuestion._id || selectedQuestion.id;
      await adminService.updateQuestionStatus(qId, {
        isActive: false,
        replacementQuestionId,
      });
      setIsSwapOpen(false);
      setSuccessMessage('Questions swapped successfully. The 10-active invariant is preserved.');
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchQuestions(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'Question swap failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const qId = selectedQuestion._id || selectedQuestion.id;
      await adminService.deleteQuestion(qId);
      setIsDeleteOpen(false);
      setSuccessMessage('Question deleted successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchQuestions(pagination.page);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to delete question. Questions active or used in historical assessments cannot be deleted.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCount = questions.filter((q) => q.isActive).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Question Bank Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage assessment questions, categories, difficulty, and active slots
          </p>
        </div>

        <Button variant="primary" size="md" onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Question
        </Button>
      </div>

      {/* Invariant Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-transparent border border-emerald-200/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Assessment Engine Invariant: Active Slots Enforced
              <Badge variant="success" size="sm">
                10 / 10 Active
              </Badge>
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              The live test requires exactly 10 active questions. Use the{' '}
              <span className="font-semibold text-indigo-700">Swap / Replace</span> action to rotate active questions safely without interrupting candidate sessions.
            </p>
          </div>
        </div>
      </div>

      {successMessage && (
        <Alert variant="success" title="Success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert variant="error" title="Action Failed" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search question text..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <Select
              placeholder="All Categories"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="py-1.5 text-xs sm:text-sm"
              options={[
                { value: '', label: 'All Categories' },
                ...categoryOptions,
              ]}
            />

            <Select
              placeholder="All Difficulties"
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="py-1.5 text-xs sm:text-sm"
              options={[
                { value: '', label: 'All Difficulties' },
                ...difficultyOptions,
              ]}
            />

            <Select
              placeholder="All Statuses"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 text-xs sm:text-sm"
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'active', label: 'Active Only' },
                { value: 'inactive', label: 'Inactive Only' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Questions Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Slot / Status</th>
                <th className="px-4 py-3.5">Question Text</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Difficulty</th>
                <th className="px-4 py-3.5">Answer</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <LoadingSpinner message="Loading questions..." />
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400">
                    No questions found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                questions.map((q) => {
                  const qId = q._id || q.id;
                  return (
                    <tr key={qId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {q.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                            Slot #{q.activeSlot}
                          </span>
                        ) : (
                          <Badge variant="outline" size="sm">
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 max-w-md">
                        <p className="font-medium text-slate-900 line-clamp-2">
                          {q.questionText}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Badge variant="primary" size="sm">
                          {q.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Badge
                          variant={
                            q.difficulty === 'Easy'
                              ? 'success'
                              : q.difficulty === 'Medium'
                              ? 'warning'
                              : 'error'
                          }
                          size="sm"
                        >
                          {q.difficulty}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-bold text-indigo-600">
                        {q.correctOption}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {q.isActive && (
                            <button
                              type="button"
                              onClick={() => openSwapModal(q)}
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Swap with inactive question"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(q)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit question"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(q)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          pageSize={15}
          onPageChange={(page) => fetchQuestions(page)}
        />
      </Card>

      {/* Modal: Create Question */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Assessment Question"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Question Text"
            required
            value={formData.questionText}
            onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
            placeholder="Enter the full question prompt..."
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              required
              options={categoryOptions}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />

            <Select
              label="Difficulty"
              required
              options={difficultyOptions}
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
            />
          </div>

          <div className="space-y-3 pt-2">
            <label className="block text-sm font-medium text-slate-700">
              Multiple Choice Options <span className="text-rose-500">*</span>
            </label>
            {formData.options.map((opt, idx) => (
              <div key={opt.optionId} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 border border-slate-200">
                  {opt.optionId}
                </span>
                <input
                  type="text"
                  required
                  placeholder={`Option ${opt.optionId} text`}
                  value={opt.text}
                  onChange={(e) => {
                    const newOptions = [...formData.options];
                    newOptions[idx].text = e.target.value;
                    setFormData({ ...formData, options: newOptions });
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <Select
              label="Correct Option"
              required
              options={[
                { value: 'A', label: 'Option A' },
                { value: 'B', label: 'Option B' },
                { value: 'C', label: 'Option C' },
                { value: 'D', label: 'Option D' },
              ]}
              value={formData.correctOption}
              onChange={(e) => setFormData({ ...formData, correctOption: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Activation Mode
              </label>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Created questions start as <span className="font-semibold text-slate-800">Inactive</span> in reserve. Swap them with an active slot when ready.
              </div>
            </div>
          </div>

          <Input
            label="Explanation (Optional)"
            placeholder="Detailed explanation of the correct answer..."
            value={formData.explanation}
            onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Question
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Question */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Assessment Question"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Question Text"
            required
            value={formData.questionText}
            onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              required
              options={categoryOptions}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />

            <Select
              label="Difficulty"
              required
              options={difficultyOptions}
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
            />
          </div>

          <div className="space-y-3 pt-2">
            <label className="block text-sm font-medium text-slate-700">
              Multiple Choice Options
            </label>
            {formData.options.map((opt, idx) => (
              <div key={opt.optionId} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 border border-slate-200">
                  {opt.optionId}
                </span>
                <input
                  type="text"
                  required
                  value={opt.text}
                  onChange={(e) => {
                    const newOptions = [...formData.options];
                    newOptions[idx].text = e.target.value;
                    setFormData({ ...formData, options: newOptions });
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <Select
              label="Correct Option"
              required
              options={[
                { value: 'A', label: 'Option A' },
                { value: 'B', label: 'Option B' },
                { value: 'C', label: 'Option C' },
                { value: 'D', label: 'Option D' },
              ]}
              value={formData.correctOption}
              onChange={(e) => setFormData({ ...formData, correctOption: e.target.value })}
            />
          </div>

          <Input
            label="Explanation (Optional)"
            value={formData.explanation}
            onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Update Question
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Atomic Swap Question */}
      <Modal
        isOpen={isSwapOpen}
        onClose={() => setIsSwapOpen(false)}
        title="Atomic Question Replacement"
        description="Preserve the exactly-10-active invariant by swapping slots with an inactive question."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSwapSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <p className="font-semibold text-slate-800">Currently Active Question (Slot #{selectedQuestion?.activeSlot}):</p>
            <p className="mt-1 text-slate-600 line-clamp-2">{selectedQuestion?.questionText}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Select Inactive Replacement Question <span className="text-rose-500">*</span>
            </label>
            {inactiveQuestions.length === 0 ? (
              <p className="text-sm text-rose-600">
                No inactive questions available in reserve. Create an inactive question first.
              </p>
            ) : (
              <select
                required
                value={replacementQuestionId}
                onChange={(e) => setReplacementQuestionId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Choose replacement question --</option>
                {inactiveQuestions.map((iq) => {
                  const id = iq._id || iq.id;
                  return (
                    <option key={id} value={id}>
                      [{iq.category}] {iq.questionText.slice(0, 75)}...
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsSwapOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!replacementQuestionId || isSubmitting}
              isLoading={isSubmitting}
            >
              Confirm Atomic Swap
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Question */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Question Deletion"
        description="Are you sure you want to delete this question? This action cannot be undone."
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
            {selectedQuestion?.questionText}
          </p>
          {selectedQuestion?.isActive && (
            <Alert variant="error" title="Warning: Active Question">
              This question is currently assigned to Slot #{selectedQuestion.activeSlot}. It cannot be deleted while active. Please swap it first.
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={selectedQuestion?.isActive || isSubmitting}
              isLoading={isSubmitting}
              onClick={handleDeleteSubmit}
            >
              Delete Question
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default QuestionManagementPage;
