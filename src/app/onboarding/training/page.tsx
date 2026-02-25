'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ProgressSteps } from '@/components/onboarding/progress-steps';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { BASE_QUESTIONS, TYPE_SPECIFIC_QUESTIONS } from '@/lib/constants/questionnaires';
import { ArrowLeft, ArrowRight, Upload, FileText, X } from 'lucide-react';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export default function TrainingPage() {
  const router = useRouter();
  const { agentType, trainingData, setTrainingAnswer, skillFileUrl, setSkillFileUrl, goToStep } = useOnboardingStore();
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const typeQuestions = TYPE_SPECIFIC_QUESTIONS[agentType || 'other'] || [];
  const allQuestions = [...BASE_QUESTIONS, ...typeQuestions];

  const requiredQuestions = allQuestions.filter((q) => q.required);
  const allRequiredFilled = requiredQuestions.every(
    (q) => trainingData[q.id]?.trim()
  );

  const handleFileUpload = useCallback((file: File) => {
    if (!file.name.endsWith('.md')) {
      toast.error('Please upload a .md file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB');
      return;
    }
    // For MVP, read the file content and store it
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setSkillFileUrl(content);
      setFileName(file.name);
      toast.success(`${file.name} uploaded`);
    };
    reader.readAsText(file);
  }, [setSkillFileUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleContinue = () => {
    if (!allRequiredFilled) {
      toast.error('Please fill in all required fields');
      return;
    }
    goToStep(5);
    router.push('/onboarding/deploy');
  };

  const handleBack = () => {
    goToStep(3);
    router.push('/onboarding/payment');
  };

  return (
    <div className="space-y-8">
      <ProgressSteps currentStep={4} />

      <div className="text-center">
        <h1 className="font-mono text-3xl font-bold tracking-tight text-neutral-900">TRAIN YOUR AGENT</h1>
        <p className="mt-2 font-mono text-sm text-neutral-500">
          Answer these questions to help your agent understand your project
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Questionnaire */}
        <Card className="border border-neutral-200 bg-white shadow-none rounded-none">
          <CardHeader className="border-b border-neutral-200">
            <CardTitle className="font-mono text-sm uppercase tracking-wider text-neutral-900">Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {BASE_QUESTIONS.map((question) => (
              <div key={question.id} className="space-y-2">
                <Label className="font-mono text-sm text-neutral-700">
                  {question.label}
                  {question.required && <span className="ml-1 text-orange-500">*</span>}
                </Label>
                {question.type === 'select' ? (
                  <select
                    value={trainingData[question.id] || ''}
                    onChange={(e) => setTrainingAnswer(question.id, e.target.value)}
                    className="w-full border border-neutral-200 bg-white px-3 py-2 font-mono text-neutral-900 rounded-none"
                  >
                    <option value="">Select...</option>
                    {question.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : question.type === 'textarea' ? (
                  <Textarea
                    placeholder={question.placeholder}
                    value={trainingData[question.id] || ''}
                    onChange={(e) => setTrainingAnswer(question.id, e.target.value)}
                    className="border-neutral-200 bg-white text-neutral-900 font-mono rounded-none placeholder:text-neutral-400"
                    rows={3}
                  />
                ) : (
                  <Input
                    type={question.type}
                    placeholder={question.placeholder}
                    value={trainingData[question.id] || ''}
                    onChange={(e) => setTrainingAnswer(question.id, e.target.value)}
                    className="border-neutral-200 bg-white text-neutral-900 font-mono rounded-none placeholder:text-neutral-400"
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Type-specific questions */}
        {typeQuestions.length > 0 && (
          <Card className="border border-neutral-200 bg-white shadow-none rounded-none">
            <CardHeader className="border-b border-neutral-200">
              <CardTitle className="font-mono text-sm uppercase tracking-wider text-neutral-900">Agent-Specific Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {typeQuestions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <Label className="font-mono text-sm text-neutral-700">
                    {question.label}
                    {question.required && <span className="ml-1 text-orange-500">*</span>}
                  </Label>
                  {question.type === 'textarea' ? (
                    <Textarea
                      placeholder={question.placeholder}
                      value={trainingData[question.id] || ''}
                      onChange={(e) => setTrainingAnswer(question.id, e.target.value)}
                      className="border-neutral-200 bg-white text-neutral-900 font-mono rounded-none placeholder:text-neutral-400"
                      rows={3}
                    />
                  ) : (
                    <Input
                      type={question.type}
                      placeholder={question.placeholder}
                      value={trainingData[question.id] || ''}
                      onChange={(e) => setTrainingAnswer(question.id, e.target.value)}
                      className="border-neutral-200 bg-white text-neutral-900 font-mono rounded-none placeholder:text-neutral-400"
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* File upload */}
        <Card className="border border-neutral-200 bg-white shadow-none rounded-none">
          <CardHeader className="border-b border-neutral-200">
            <CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-neutral-900">
              Upload Skill File
              <Badge variant="outline" className="border-neutral-200 text-neutral-400 font-mono rounded-none text-xs">Optional</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {fileName ? (
              <div className="flex items-center justify-between border border-orange-200 bg-orange-50 p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-orange-500" />
                  <span className="font-mono text-sm text-neutral-900">{fileName}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFileName(null);
                    setSkillFileUrl(null);
                  }}
                  className="text-neutral-400 hover:text-neutral-900 rounded-none"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`flex cursor-pointer flex-col items-center justify-center border-2 border-dashed p-8 transition-colors rounded-none ${
                  dragOver
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-neutral-300 hover:border-orange-500'
                }`}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.md';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleFileUpload(file);
                  };
                  input.click();
                }}
              >
                <Upload className="mb-3 h-8 w-8 text-neutral-400" />
                <p className="font-mono text-sm text-neutral-500">
                  Drag & drop your <code className="text-orange-500 font-mono">skill.md</code> file here, or click to browse
                </p>
                <p className="mt-1 font-mono text-xs text-neutral-400">Markdown files up to 5MB</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Templates (coming soon) */}
        <Card className="border border-neutral-200 bg-neutral-50 shadow-none rounded-none opacity-50">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="font-mono text-sm text-neutral-400">Browse Templates</p>
              <p className="font-mono text-xs text-neutral-400">Pre-built training templates for common use cases</p>
            </div>
            <Badge className="bg-neutral-200 text-neutral-500 font-mono uppercase text-xs rounded-none">Coming Soon</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button
          onClick={handleBack}
          variant="outline"
          size="lg"
          className="rounded-none border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-mono uppercase tracking-wider"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!allRequiredFilled}
          size="lg"
          className="rounded-none bg-orange-500 px-8 text-white hover:bg-orange-600 font-mono uppercase tracking-wider disabled:opacity-50"
        >
          Deploy Agent
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
