import React, { useState, useEffect } from 'react';
import adminService from '../../services/adminService.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/common/Card.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Alert from '../../components/common/Alert.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import { Settings, Save, AlertCircle, ShieldCheck } from 'lucide-react';

export function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [formData, setFormData] = useState({
    testDurationMinutes: 15,
    passPercentage: 60,
    correctMarkWeight: 2,
    negativeMarkWeight: 1,
    totalTestQuestions: 10,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const response = await adminService.getSettings();
        if (isMounted) {
          const s = response.data.settings;
          setSettings(s);
          setFormData({
            testDurationMinutes: s.testDurationMinutes || 15,
            passPercentage: s.passPercentage || 60,
            correctMarkWeight: s.correctMarkWeight || 2,
            negativeMarkWeight: s.negativeMarkWeight || 1,
            totalTestQuestions: 10,
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load settings.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        testDurationMinutes: Number(formData.testDurationMinutes),
        passPercentage: Number(formData.passPercentage),
        correctMarkWeight: Number(formData.correctMarkWeight),
        negativeMarkWeight: Number(formData.negativeMarkWeight),
      };

      const response = await adminService.updateSettings(payload);
      setSettings(response.data.settings);
      setSuccessMessage('Assessment parameters updated successfully. Changes apply to future assessments.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to update settings. Please check parameters.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullPage message="Loading system configuration..." />;
  }

  return (
    <div className="py-2 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          System & Assessment Settings
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure test duration, passing criteria, and evaluation mark weights
        </p>
      </div>

      {successMessage && (
        <Alert variant="success" title="Settings Saved" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert variant="error" title="Update Error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Aptitude Evaluation Parameters
          </CardTitle>
          <CardDescription>
            These settings govern the assessment engine timer, passing cutoffs, and scoring logic.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                id="testDurationMinutes"
                label="Test Duration (Minutes)"
                type="number"
                min={5}
                max={180}
                required
                value={formData.testDurationMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, testDurationMinutes: e.target.value })
                }
                helperText="Allowed range: 5 to 180 minutes (Default: 15)"
              />

              <Input
                id="passPercentage"
                label="Pass Percentage Cutoff (%)"
                type="number"
                min={0}
                max={100}
                required
                value={formData.passPercentage}
                onChange={(e) =>
                  setFormData({ ...formData, passPercentage: e.target.value })
                }
                helperText="Minimum % required to pass (Default: 60%)"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                id="correctMarkWeight"
                label="Correct Answer Marks"
                type="number"
                step="0.5"
                min={0.5}
                required
                value={formData.correctMarkWeight}
                onChange={(e) =>
                  setFormData({ ...formData, correctMarkWeight: e.target.value })
                }
                helperText="Marks awarded for each correct answer (Default: +2)"
              />

              <Input
                id="negativeMarkWeight"
                label="Negative Penalty Marks"
                type="number"
                step="0.5"
                min={0}
                required
                value={formData.negativeMarkWeight}
                onChange={(e) =>
                  setFormData({ ...formData, negativeMarkWeight: e.target.value })
                }
                helperText="Marks deducted for each incorrect answer (Default: 1)"
              />
            </div>

            <div>
              <Input
                label="Total Test Questions"
                type="number"
                disabled
                value={10}
                helperText="Fixed architectural invariant: Exactly 10 questions per assessment."
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs sm:text-sm text-slate-600">
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Snapshot Integrity Guarantee:</p>
                <p className="mt-0.5">
                  Assessment attempts snapshot settings at the moment a candidate starts the test. Updating settings will apply to all subsequent new assessments without mutating historical or currently in-progress attempts.
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="justify-end pt-4">
            <Button type="submit" variant="primary" size="md" isLoading={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default SettingsPage;
