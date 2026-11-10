import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Check,
  AlertTriangle,
  Upload,
  FileText,
  ExternalLink,
  Bell,
  RotateCcw,
  ShieldAlert,
  Ban,
  Play,
  SlidersHorizontal
} from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { StatusChip } from '../common/StatusChip';
import { ProjectSummary, DeliveryRecord, CancellationRequestRecord, DisputeRecord } from '../../types';
import { formatMoney, formatCents, formatDate, formatDueCountdown } from '../../lib/present';

const REJECT_CHIPS = [
  'Not a good fit',
  'Too busy',
  'Budget too low',
  'Out of scope',
  'Deadline too tight',
  'Other'
];

const DISPUTE_CHIPS = [
  'Work never arrived',
  'Work incomplete',
  'Missing agreed files',
  'Scope mismatch',
  'Missed deadline',
  'Other'
];

interface ProjectStagePanelProps {
  projectId: string;
  projectStatus: string;
  isBuyer: boolean;
  isSeller: boolean;
  counterpartName: string;
  revisionsAllowed?: number;
  revisionsUsed?: number;
  dueAt?: string | null;
  reviewDueAt?: string | null;
  isOverdue?: boolean;
  rejectReason?: string | null;
  sharedRejectNote?: string | null;
  deliveries?: DeliveryRecord[];
  cancellationRequest?: CancellationRequestRecord | null;
  dispute?: DisputeRecord | null;
  capturedCents?: number;
  paidOutCents?: number;
  refundedCents?: number;
  currentPrice?: number;
  currentDays?: number;
  onRefresh: () => void;
}

async function readFilesToBase64(fileList: FileList | null): Promise<Array<{ originalName: string; mimeType: string; contentBase64: string }>> {
  if (!fileList || fileList.length === 0) return [];
  const list = Array.from(fileList).slice(0, 5);
  const results: Array<{ originalName: string; mimeType: string; contentBase64: string }> = [];
  for (const file of list) {
    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`"${file.name}" exceeds the 10 MB size limit.`);
    }
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || '');
        const idx = res.indexOf('base64,');
        resolve(idx >= 0 ? res.slice(idx + 7) : res);
      };
      reader.onerror = () => reject(new Error(`Could not read "${file.name}".`));
      reader.readAsDataURL(file);
    });
    results.push({
      originalName: file.name,
      mimeType: file.type || 'application/octet-stream',
      contentBase64: base64
    });
  }
  return results;
}

export const ProjectStagePanel: React.FC<ProjectStagePanelProps> = ({
  projectId,
  projectStatus,
  isBuyer,
  isSeller,
  counterpartName,
  revisionsAllowed = 1,
  revisionsUsed = 0,
  dueAt,
  reviewDueAt,
  isOverdue,
  rejectReason,
  sharedRejectNote,
  deliveries = [],
  cancellationRequest,
  dispute,
  capturedCents = 0,
  paidOutCents = 0,
  refundedCents = 0,
  currentPrice = 0,
  currentDays = 5,
  onRefresh
}) => {
  const queryClient = useQueryClient();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectChip, setRejectChip] = useState(REJECT_CHIPS[0]);
  const [rejectNote, setRejectNote] = useState('');
  const [shareNoteWithBuyer, setShareNoteWithBuyer] = useState(false);

  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterPrice, setCounterPrice] = useState(String(currentPrice || 150));
  const [counterDays, setCounterDays] = useState(String(currentDays || 5));

  const [confirmAction, setConfirmAction] = useState<null | 'buyer_cancel_refund' | 'seller_cancel_refund'>(null);

  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliveryLinkInput, setDeliveryLinkInput] = useState('');
  const [deliveryLinks, setDeliveryLinks] = useState<string[]>([]);
  const [deliveryFiles, setDeliveryFiles] = useState<Array<{ originalName: string; mimeType: string; contentBase64: string }>>([]);

  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionMsg, setRevisionMsg] = useState('');

  const [showRequestCancelForm, setShowRequestCancelForm] = useState(false);
  const [requestCancelReason, setRequestCancelReason] = useState('');
  const [partialRefundInput, setPartialRefundInput] = useState('');

  const [showVoluntaryRefund, setShowVoluntaryRefund] = useState(false);
  const [voluntaryRefundDollars, setVoluntaryRefundDollars] = useState('');
  const [voluntaryRefundReason, setVoluntaryRefundReason] = useState('');

  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeChip, setDisputeChip] = useState(DISPUTE_CHIPS[0]);
  const [disputeDesc, setDisputeDesc] = useState('');
  const [disputeLink, setDisputeLink] = useState('');
  const [disputeFiles, setDisputeFiles] = useState<Array<{ originalName: string; mimeType: string; contentBase64: string }>>([]);

  const [respondDisputeNote, setRespondDisputeNote] = useState('');
  const [respondDisputeLink, setRespondDisputeLink] = useState('');
  const [respondDisputeFiles, setRespondDisputeFiles] = useState<Array<{ originalName: string; mimeType: string; contentBase64: string }>>([]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['negotiationDetail', projectId] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['home'] });
    onRefresh();
  };

  const acceptReqMut = useMutation({
    mutationFn: () => api.acceptProjectRequest(projectId),
    onSuccess: () => { toast.success('Request accepted.'); invalidateAll(); },
    onError: (e: any) => toast.error(e.message)
  });

  const counterReqMut = useMutation({
    mutationFn: () => api.counterProjectRequest(projectId, Number(counterPrice), Number(counterDays)),
    onSuccess: () => { toast.success('Counteroffer sent.'); setShowCounterForm(false); invalidateAll(); },
    onError: (e: any) => toast.error(e.message)
  });

  const rejectMut = useMutation({
    mutationFn: () => api.rejectProject(projectId, { reasonChip: rejectChip, note: rejectNote, shareNote: shareNoteWithBuyer }),
    onSuccess: () => { toast.success('Request declined.'); setShowRejectModal(false); invalidateAll(); },
    onError: (e: any) => toast.error(e.message)
  });

  const overrideAutoMut = useMutation({
    mutationFn: () => api.overrideAutoDecline(projectId),
    onSuccess: () => { toast.success('Rule overridden — negotiation reopened.'); invalidateAll(); },
    onError: (e: any) => toast.error(e.message)
  });

  const cancelMut = useMutation({
    mutationFn: (reason: string) => api.cancelProject(projectId, reason),
    onSuccess: () => {
      toast.success(projectStatus === 'paid_held' ? 'Project cancelled and full PayPal refund issued.' : 'Project cancelled.');
      setConfirmAction(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(e.message)
  });

  const startWorkMut = useMutation({
    mutationFn: () => api.startProjectWork(projectId),
    onSuccess: () => { toast.success('Work started — escrow locked against instant cancellation.'); invalidateAll(); },
    onError: (e: any) => toast.error(e.message)
  });

  const deliverMut = useMutation({
    mutationFn: () => api.deliverProjectWork(projectId, { note: deliveryNote.trim(), links: deliveryLinks, files: deliveryFiles }),
    onSuccess: () => {
      toast.success('Work delivered to buyer for review.');
      setDeliveryNote('');
      setDeliveryLinks([]);
      setDeliveryFiles([]);
      invalidateAll();
    },
    onError: (e: any) => toast.error(e.message)
  });

  const acceptWorkMut = useMutation({
    mutationFn: () => api.acceptProjectWork(projectId),
    onSuccess: () => { toast.success('Work accepted — seller payout released.'); invalidateAll(); },
    onError: (e: any) => toast.error(e.message)
  });

  const requestChangesMut = useMutation({
    mutationFn: () => api.requestProjectChanges(projectId, revisionMsg.trim()),
    onSuccess: () => { toast.success('Revision requested from seller.'); setShowRevisionForm(false); setRevisionMsg(''); invalidateAll(); },
    onError: (e: any) => toast.error(e.message)
  });

  const remindMut = useMutation({
    mutationFn: () => api.sendProjectReminder(projectId),
    onSuccess: () => { toast.success('Reminder sent to buyer.'); invalidateAll(); },
    onError: (e: any) => toast.error(e.message)
  });

  const reqCancelMut = useMutation({
    mutationFn: () => api.requestProjectCancel(projectId, requestCancelReason.trim()),
    onSuccess: () => { toast.success('Cancellation request sent to seller.'); setShowRequestCancelForm(false); setRequestCancelReason(''); invalidateAll(); },
    onError: (e: any) => toast.error(e.message)
  });

  const respondCancelMut = useMutation({
    mutationFn: (payload: { action: 'agree_full' | 'agree_partial' | 'decline'; partialRefundCents?: number; note?: string }) =>
      api.respondProjectCancel(projectId, payload),
    onSuccess: () => { toast.success('Response recorded.'); invalidateAll(); },
    onError: (e: any) => toast.error(e.message)
  });

  const voluntaryRefundMut = useMutation({
    mutationFn: () => api.issueVoluntaryRefund(projectId, {
      amountCents: voluntaryRefundDollars.trim() ? Math.round(Number(voluntaryRefundDollars) * 100) : undefined,
      reason: voluntaryRefundReason.trim() || 'Seller issued voluntary refund'
    }),
    onSuccess: () => { toast.success('Refund issued to buyer.'); setShowVoluntaryRefund(false); invalidateAll(); },
    onError: (e: any) => toast.error(e.message)
  });

  const openDisputeMut = useMutation({
    mutationFn: () => api.openProjectDispute(projectId, {
      reasonChip: disputeChip,
      description: disputeDesc.trim(),
      evidenceLinks: disputeLink.trim() ? [disputeLink.trim()] : [],
      files: disputeFiles
    }),
    onSuccess: () => { toast.success('Dispute opened. Funds remain held until resolved.'); setShowDisputeForm(false); invalidateAll(); },
    onError: (e: any) => toast.error(e.message)
  });

  const respondDisputeMut = useMutation({
    mutationFn: () => api.respondProjectDispute(projectId, {
      note: respondDisputeNote.trim(),
      evidenceLinks: respondDisputeLink.trim() ? [respondDisputeLink.trim()] : [],
      files: respondDisputeFiles
    }),
    onSuccess: () => { toast.success('Dispute response submitted.'); invalidateAll(); },
    onError: (e: any) => toast.error(e.message)
  });

  const dueCountdown = formatDueCountdown(dueAt);
  const reviewCountdown = formatDueCountdown(reviewDueAt);
  const remainingHeldCents = Math.max(0, capturedCents - refundedCents - paidOutCents);

  return (
    <div className="flex flex-col gap-4">
      {/* Countdowns / Overdue Banner */}
      {(projectStatus === 'in_progress' || projectStatus === 'revision_requested') && dueCountdown && (
        <div className={`px-4 py-2.5 rounded-control border text-secondary flex items-center justify-between ${
          dueCountdown.isOverdue
            ? 'border-status-declined/40 bg-status-declined/10 text-status-declined'
            : dueCountdown.isSoon
            ? 'border-status-needs/40 bg-status-needs/10 text-status-needs'
            : 'border-border-subtle bg-raised text-text-muted'
        }`}>
          <span>Delivery window</span>
          <span className="font-semibold">{dueCountdown.label}</span>
        </div>
      )}

      {projectStatus === 'delivered' && reviewCountdown && (
        <div className="px-4 py-2.5 rounded-control border border-border-subtle bg-raised text-secondary flex items-center justify-between">
          <span className="text-text-muted">Auto-accept review window</span>
          <span className="font-semibold text-text-primary">{reviewCountdown.label}</span>
        </div>
      )}

      {/* Stage 1: request_sent */}
      {projectStatus === 'request_sent' && isSeller && (
        <Card className="p-5 flex flex-col gap-4">
          <div>
            <h3 className="font-semibold text-body text-text-primary">Respond to buyer request</h3>
            <p className="text-secondary text-text-muted mt-0.5">
              Proposed budget: {formatMoney(currentPrice)} · {currentDays} days
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="volt" size="sm" isLoading={acceptReqMut.isPending} onClick={() => acceptReqMut.mutate()}>
              Accept
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowCounterForm(v => !v)}>
              Counter
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowRejectModal(true)}>
              Reject
            </Button>
          </div>

          {showCounterForm && (
            <div className="p-3.5 rounded-control bg-raised border border-border-subtle flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-secondary text-text-muted">Price ($)</label>
                  <input
                    type="number"
                    min="1"
                    value={counterPrice}
                    onChange={(e) => setCounterPrice(e.target.value)}
                    className="w-full h-9 px-3 mt-1 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-secondary text-text-muted">Days</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={counterDays}
                    onChange={(e) => setCounterDays(e.target.value)}
                    className="w-full h-9 px-3 mt-1 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowCounterForm(false)}>Cancel</Button>
                <Button variant="volt" size="sm" isLoading={counterReqMut.isPending} onClick={() => counterReqMut.mutate()}>
                  Send counteroffer
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {projectStatus === 'request_sent' && isBuyer && (
        <Card className="p-5 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-body text-text-primary">Waiting for {counterpartName}</span>
            <span className="text-secondary text-text-muted">They can accept, send a counteroffer, or decline.</span>
          </div>
          <Button variant="outline" size="sm" isLoading={cancelMut.isPending} onClick={() => cancelMut.mutate('Buyer withdrew request.')}>
            Cancel request
          </Button>
        </Card>
      )}

      {/* Stage 2: negotiating or agreed (before payment) */}
      {(projectStatus === 'negotiating' || projectStatus === 'agreed') && (
        <Card className="p-4 flex items-center justify-between gap-3 bg-surface">
          <span className="text-secondary text-text-muted">
            {projectStatus === 'negotiating' ? 'Negotiation active before payment.' : 'Agreed — no payment captured yet.'}
          </span>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Ban className="w-3.5 h-3.5" />}
            onClick={() => projectStatus === 'negotiating' ? setShowRejectModal(true) : cancelMut.mutate('Cancelled before payment.')}
          >
            {projectStatus === 'negotiating' ? 'Stop negotiating' : 'Cancel before payment'}
          </Button>
        </Card>
      )}

      {/* Declined */}
      {projectStatus === 'declined' && (
        <Card className="p-5 flex flex-col gap-3 border-status-declined/30 bg-status-declined/10">
          <span className="font-semibold text-body text-status-declined">Declined before payment</span>
          <p className="text-secondary text-text-muted">
            {isSeller
              ? rejectReason || 'This request was declined.'
              : sharedRejectNote
              ? `This seller can't take it ("${sharedRejectNote}"). I'm looking at other options.`
              : "This seller can't take it. I'm looking at other options."}
          </p>
          {isBuyer && (
            <div>
              <Link to="/app/marketplace">
                <Button variant="secondary" size="sm">Browse other sellers</Button>
              </Link>
            </div>
          )}
          {isSeller && (rejectReason || '').toLowerCase().includes('auto-declined by your rules') && (
            <div>
              <Button variant="volt" size="sm" isLoading={overrideAutoMut.isPending} onClick={() => overrideAutoMut.mutate()}>
                Override auto-decline &amp; review
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Stage: paid_held */}
      {projectStatus === 'paid_held' && isSeller && (
        <Card className="p-5 flex flex-col gap-3">
          <div>
            <h3 className="font-semibold text-body text-text-primary">Payment is held safely by VYRO</h3>
            <p className="text-secondary text-text-muted mt-0.5">
              Start work now to confirm commitment. Once started, buyers must request cancellation instead of instant refunds.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="volt"
              size="md"
              leftIcon={<Play className="w-4 h-4" />}
              isLoading={startWorkMut.isPending}
              onClick={() => startWorkMut.mutate()}
            >
              Start work
            </Button>
            <Button variant="outline" size="md" onClick={() => setConfirmAction('seller_cancel_refund')}>
              Cancel &amp; refund buyer
            </Button>
          </div>
        </Card>
      )}

      {projectStatus === 'paid_held' && isBuyer && (
        <Card className="p-5 flex flex-col gap-3">
          <div>
            <h3 className="font-semibold text-body text-text-primary">Paid with PayPal · waiting for seller to start</h3>
            <p className="text-secondary text-text-muted mt-0.5">
              Your {formatCents(capturedCents)} is held by VYRO. Because work hasn&apos;t started yet, you can cancel for a full refund anytime.
            </p>
          </div>
          <div>
            <Button variant="outline" size="sm" onClick={() => setConfirmAction('buyer_cancel_refund')}>
              Cancel and get a full refund
            </Button>
          </div>
        </Card>
      )}

      {/* Stage: in_progress or revision_requested — Seller Delivery Form & Voluntary Refund */}
      {(projectStatus === 'in_progress' || projectStatus === 'revision_requested') && isSeller && (
        <>
          {cancellationRequest && cancellationRequest.status === 'pending' && (
            <Card className="p-5 flex flex-col gap-3 border-status-needs/40 bg-status-needs/5">
              <div className="flex items-center gap-2 text-status-needs font-semibold text-body">
                <AlertTriangle className="w-4 h-4" />
                <span>Buyer requested cancellation</span>
              </div>
              <p className="text-secondary text-text-primary">Reason: &ldquo;{cancellationRequest.reason}&rdquo;</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="volt"
                  size="sm"
                  isLoading={respondCancelMut.isPending}
                  onClick={() => respondCancelMut.mutate({ action: 'agree_full' })}
                >
                  Agree full refund ({formatCents(remainingHeldCents)})
                </Button>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max={Math.floor(remainingHeldCents / 100)}
                    placeholder="Partial $"
                    value={partialRefundInput}
                    onChange={(e) => setPartialRefundInput(e.target.value)}
                    className="w-24 h-8 px-2 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!partialRefundInput || Number(partialRefundInput) <= 0}
                    isLoading={respondCancelMut.isPending}
                    onClick={() =>
                      respondCancelMut.mutate({
                        action: 'agree_partial',
                        partialRefundCents: Math.round(Number(partialRefundInput) * 100)
                      })
                    }
                  >
                    Partial refund
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={respondCancelMut.isPending}
                  onClick={() => respondCancelMut.mutate({ action: 'decline' })}
                >
                  Decline &amp; continue
                </Button>
              </div>
            </Card>
          )}

          <Card className="p-5 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-body text-text-primary">
                {projectStatus === 'revision_requested' ? 'Deliver revised work' : 'Deliver work'}
              </h3>
              <StatusChip label={projectStatus === 'revision_requested' ? 'Revision' : 'Active'} role="inProgress" size="sm" />
            </div>

            <textarea
              rows={3}
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              placeholder="Summarize what you delivered and how to test or inspect it..."
              className="w-full p-3 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary focus:outline-none focus:border-volt resize-none"
            />

            {/* Links input */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={deliveryLinkInput}
                  onChange={(e) => setDeliveryLinkInput(e.target.value)}
                  placeholder="https://... (up to 5 delivery links)"
                  className="flex-1 h-9 px-3 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!deliveryLinkInput.trim() || deliveryLinks.length >= 5}
                  onClick={() => {
                    setDeliveryLinks(prev => [...prev, deliveryLinkInput.trim()]);
                    setDeliveryLinkInput('');
                  }}
                >
                  Add link
                </Button>
              </div>
              {deliveryLinks.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {deliveryLinks.map((lnk, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip bg-raised text-secondary text-text-muted">
                      {lnk}
                      <button type="button" onClick={() => setDeliveryLinks(prev => prev.filter((_, i) => i !== idx))} className="text-text-primary">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* File upload */}
            <div className="flex flex-col gap-1.5">
              <label className="text-secondary text-text-muted flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Attach deliverables (PDF, PNG, JPG, ZIP, TXT, JSON, CSV — max 10 MB each)</span>
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp,.zip,.txt,.md,.json,.csv"
                onChange={async (e) => {
                  try {
                    const parsed = await readFilesToBase64(e.target.files);
                    setDeliveryFiles(parsed);
                  } catch (err: any) {
                    toast.error(err.message);
                  }
                }}
                className="text-secondary text-text-muted"
              />
              {deliveryFiles.length > 0 && (
                <span className="text-secondary text-status-handled">
                  {deliveryFiles.length} {deliveryFiles.length === 1 ? 'file' : 'files'} attached ready to upload
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVoluntaryRefund(v => !v)}
              >
                Issue voluntary refund
              </Button>
              <Button
                variant="volt"
                size="md"
                isLoading={deliverMut.isPending}
                disabled={deliveryNote.trim().length < 5}
                onClick={() => deliverMut.mutate()}
              >
                Submit delivery
              </Button>
            </div>

            {showVoluntaryRefund && (
              <div className="p-3 rounded-control bg-raised border border-border-subtle flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder={`Full (${Math.round(remainingHeldCents / 100)})`}
                    value={voluntaryRefundDollars}
                    onChange={(e) => setVoluntaryRefundDollars(e.target.value)}
                    className="h-9 px-3 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary"
                  />
                  <input
                    type="text"
                    placeholder="Reason for refund"
                    value={voluntaryRefundReason}
                    onChange={(e) => setVoluntaryRefundReason(e.target.value)}
                    className="h-9 px-3 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowVoluntaryRefund(false)}>Cancel</Button>
                  <Button variant="danger" size="sm" isLoading={voluntaryRefundMut.isPending} onClick={() => voluntaryRefundMut.mutate()}>
                    Confirm refund
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Stage: in_progress or revision_requested — Buyer view */}
      {(projectStatus === 'in_progress' || projectStatus === 'revision_requested') && isBuyer && (
        <Card className="p-5 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold text-body text-text-primary">
              {projectStatus === 'revision_requested' ? 'Revision requested' : 'Work is in progress'}
            </h3>
            <p className="text-secondary text-text-muted">
              {projectStatus === 'revision_requested'
                ? 'Seller is updating your deliverables.'
                : 'Funds stay safely held by VYRO until the seller delivers and you accept.'}
            </p>
          </div>

          {isOverdue && (
            <div className="p-3 rounded-control border border-status-needs/40 bg-status-needs/10 text-secondary flex flex-col gap-2">
              <span className="font-semibold text-status-needs">Seller is past the agreed delivery deadline</span>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowRequestCancelForm(true)}>
                  Request cancellation
                </Button>
                <Button variant="danger" size="sm" onClick={() => setShowDisputeForm(true)}>
                  Report a problem
                </Button>
              </div>
            </div>
          )}

          {projectStatus === 'in_progress' && !cancellationRequest && !showRequestCancelForm && (
            <div>
              <Button variant="outline" size="sm" onClick={() => setShowRequestCancelForm(true)}>
                Request cancellation
              </Button>
            </div>
          )}

          {cancellationRequest && cancellationRequest.status === 'pending' && (
            <p className="text-secondary text-status-needs font-medium">
              Cancellation requested — waiting for seller decision.
            </p>
          )}

          {cancellationRequest && cancellationRequest.status === 'declined' && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-secondary text-text-muted">Seller declined cancellation.</span>
              <Button variant="outline" size="sm" onClick={() => setShowDisputeForm(true)}>Open dispute</Button>
            </div>
          )}

          {showRequestCancelForm && (
            <div className="p-3.5 rounded-control bg-raised border border-border-subtle flex flex-col gap-2.5">
              <textarea
                rows={2}
                value={requestCancelReason}
                onChange={(e) => setRequestCancelReason(e.target.value)}
                placeholder="Explain why you'd like to cancel and propose a refund..."
                className="w-full p-2.5 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowRequestCancelForm(false)}>Close</Button>
                <Button
                  variant="volt"
                  size="sm"
                  disabled={requestCancelReason.trim().length < 5}
                  isLoading={reqCancelMut.isPending}
                  onClick={() => reqCancelMut.mutate()}
                >
                  Send request to seller
                </Button>
              </div>
            </div>
          )}

          {projectStatus === 'revision_requested' && (
            <div>
              <Button variant="outline" size="sm" onClick={() => setShowDisputeForm(true)}>
                Report a problem
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Delivery Evidence Showcase (for delivered / revision_requested / disputed / accepted / completed) */}
      {deliveries.length > 0 && (
        <Card className="p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-body text-text-primary">Submitted deliveries</h3>
            <span className="text-secondary text-text-muted">Revisions used: {revisionsUsed} of {revisionsAllowed}</span>
          </div>
          {deliveries.map((del, idx) => (
            <div key={del.id} className="p-3.5 rounded-control bg-raised border border-border-subtle flex flex-col gap-2">
              <div className="flex items-center justify-between text-secondary text-text-muted">
                <span>Delivery #{del.round ?? ((del.revisionNumber ?? idx) + 1)}</span>
                <span>{formatDate(del.createdAt)}</span>
              </div>
              <p className="text-secondary text-text-primary whitespace-pre-wrap">{del.note}</p>
              {del.links && del.links.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {del.links.map((lnk, idx) => (
                    <a
                      key={idx}
                      href={lnk}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-secondary text-volt hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{lnk}</span>
                    </a>
                  ))}
                </div>
              )}
              {del.files && del.files.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {del.files.map((f) => (
                    <a
                      key={f.id}
                      href={`/api/v1/projects/${projectId}/files/${f.id}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-surface border border-border-subtle text-secondary text-text-primary hover:border-volt"
                    >
                      <FileText className="w-3.5 h-3.5 text-volt" />
                      <span>{f.originalName}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* Stage: delivered — Strict Fail-Safe: ZERO refund button! ONLY Accept / Request changes / Report a problem */}
      {projectStatus === 'delivered' && isBuyer && (
        <Card className="p-5 flex flex-col gap-3.5 border-volt/30">
          <div>
            <h3 className="font-semibold text-body text-text-primary">Review delivered work</h3>
            <p className="text-secondary text-text-muted mt-0.5">
              Accept work to release earnings to {counterpartName}, request a revision, or report a problem.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="volt"
              size="md"
              leftIcon={<Check className="w-4 h-4" strokeWidth={2.5} />}
              isLoading={acceptWorkMut.isPending}
              onClick={() => acceptWorkMut.mutate()}
            >
              Accept work
            </Button>
            {revisionsUsed < revisionsAllowed && (
              <Button variant="secondary" size="md" onClick={() => setShowRevisionForm(v => !v)}>
                Request changes ({revisionsAllowed - revisionsUsed} left)
              </Button>
            )}
            <Button variant="outline" size="md" onClick={() => setShowDisputeForm(v => !v)}>
              Report a problem
            </Button>
          </div>

          {showRevisionForm && (
            <div className="p-3.5 rounded-control bg-raised border border-border-subtle flex flex-col gap-2.5">
              <label className="text-secondary font-medium text-text-primary">What needs to be revised?</label>
              <textarea
                rows={2}
                value={revisionMsg}
                onChange={(e) => setRevisionMsg(e.target.value)}
                placeholder="Be specific so the seller can adjust the delivery..."
                className="w-full p-2.5 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowRevisionForm(false)}>Cancel</Button>
                <Button
                  variant="volt"
                  size="sm"
                  isLoading={requestChangesMut.isPending}
                  disabled={revisionMsg.trim().length < 5}
                  onClick={() => requestChangesMut.mutate()}
                >
                  Request changes
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {projectStatus === 'delivered' && isSeller && (
        <Card className="p-5 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-body text-text-primary">Delivered · waiting for buyer acceptance</span>
            <span className="text-secondary text-text-muted">
              {reviewCountdown ? `Auto-accepts ${reviewCountdown.label.toLowerCase()} if buyer doesn't respond.` : 'Awaiting buyer review.'}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Bell className="w-3.5 h-3.5" />}
            isLoading={remindMut.isPending}
            onClick={() => remindMut.mutate()}
          >
            Send reminder
          </Button>
        </Card>
      )}

      {/* Stage: disputed (Side-by-side summary + respondent reply + mediator screen link; zero payouts/refunds) */}
      {projectStatus === 'disputed' && dispute && (
        <Card className="p-5 flex flex-col gap-4 border-status-needs/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-status-needs font-semibold text-body">
              <ShieldAlert className="w-4 h-4" />
              <span>Dispute open — funds frozen</span>
            </div>
            <Link to="/app/disputes">
              <Button variant="secondary" size="sm" leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}>
                Resolve disputes
              </Button>
            </Link>
          </div>

          <div className="p-3.5 rounded-control bg-raised border border-border-subtle flex flex-col gap-1.5 text-secondary">
            <span className="font-semibold text-text-primary">Reason: {dispute.reasonChip}</span>
            <p className="text-text-muted">{dispute.description}</p>
            {dispute.respondentNote && (
              <p className="text-text-primary pt-1 border-t border-border-subtle">
                <strong>Counterparty response:</strong> {dispute.respondentNote}
              </p>
            )}
          </div>

          {dispute.status === 'open' && (
            <div className="p-3.5 rounded-control bg-surface border border-border-subtle flex flex-col gap-2.5">
              <span className="font-medium text-secondary text-text-primary">Submit response &amp; evidence</span>
              <textarea
                rows={2}
                value={respondDisputeNote}
                onChange={(e) => setRespondDisputeNote(e.target.value)}
                placeholder="Provide your explanation or proof of delivery..."
                className="w-full p-2.5 bg-raised border border-border-subtle rounded-control text-secondary text-text-primary resize-none"
              />
              <input
                type="url"
                value={respondDisputeLink}
                onChange={(e) => setRespondDisputeLink(e.target.value)}
                placeholder="Supporting URL (optional)"
                className="h-9 px-3 bg-raised border border-border-subtle rounded-control text-secondary text-text-primary"
              />
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp,.zip,.txt,.md,.json,.csv"
                onChange={async (e) => {
                  try { setRespondDisputeFiles(await readFilesToBase64(e.target.files)); } catch (err: any) { toast.error(err.message); }
                }}
                className="text-secondary text-text-muted"
              />
              <div className="flex justify-end">
                <Button
                  variant="volt"
                  size="sm"
                  disabled={respondDisputeNote.trim().length < 5}
                  isLoading={respondDisputeMut.isPending}
                  onClick={() => respondDisputeMut.mutate()}
                >
                  Submit evidence
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* After payout notice for seller */}
      {isSeller && paidOutCents > 0 && (
        <Card className="p-4 text-secondary text-text-muted">
          Payout already released. To refund the buyer after payout, issue a refund directly inside your PayPal account.
        </Card>
      )}

      {/* Reject Popover / Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 flex flex-col gap-4">
            <h3 className="font-display font-bold text-[18px] text-text-primary">
              {projectStatus === 'request_sent' ? 'Decline request' : 'Stop negotiating'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {REJECT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setRejectChip(chip)}
                  className={`px-3 py-1 rounded-chip text-secondary border cursor-pointer transition-colors ${
                    rejectChip === chip
                      ? 'bg-volt text-[#0C0E0D] border-volt font-semibold'
                      : 'bg-raised border-border-subtle text-text-muted hover:text-text-primary'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Optional note..."
              className="w-full p-2.5 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary resize-none"
            />
            {isSeller && (
              <label className="flex items-center gap-2 text-secondary text-text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareNoteWithBuyer}
                  onChange={(e) => setShareNoteWithBuyer(e.target.checked)}
                />
                <span>Share note with buyer (otherwise we only show a neutral decline message)</span>
              </label>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowRejectModal(false)}>Keep</Button>
              <Button variant="danger" size="sm" isLoading={rejectMut.isPending} onClick={() => rejectMut.mutate()}>
                Reject
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Irreversible Money Action Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 flex flex-col gap-4">
            <h3 className="font-display font-bold text-[18px] text-text-primary">
              Confirm full PayPal refund
            </h3>
            <p className="text-secondary text-text-muted">
              {confirmAction === 'buyer_cancel_refund'
                ? `This cancels the project and immediately refunds ${formatCents(remainingHeldCents)} to your PayPal payment method. Refunds are final.`
                : `Cancelling after buyer paid refunds ${formatCents(remainingHeldCents)} in full and may affect your seller reliability score.`}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmAction(null)}>Keep project</Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={cancelMut.isPending}
                onClick={() => cancelMut.mutate(confirmAction === 'buyer_cancel_refund' ? 'Buyer cancelled before work started.' : 'Seller cancelled before starting work.')}
              >
                Confirm refund
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Open Dispute Modal/Form */}
      {showDisputeForm && (
        <Card className="p-5 flex flex-col gap-3 border-status-declined/40">
          <h3 className="font-semibold text-body text-text-primary">Open a dispute</h3>
          <div className="flex flex-wrap gap-2">
            {DISPUTE_CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDisputeChip(c)}
                className={`px-2.5 py-1 rounded-chip text-secondary border cursor-pointer ${
                  disputeChip === c ? 'bg-volt text-[#0C0E0D] border-volt font-semibold' : 'bg-raised border-border-subtle text-text-muted'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <textarea
            rows={3}
            value={disputeDesc}
            onChange={(e) => setDisputeDesc(e.target.value)}
            placeholder="Describe what happened cleanly with concrete details..."
            className="w-full p-2.5 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary resize-none"
          />
          <input
            type="url"
            value={disputeLink}
            onChange={(e) => setDisputeLink(e.target.value)}
            placeholder="Evidence link (optional)"
            className="h-9 px-3 bg-surface border border-border-subtle rounded-control text-secondary text-text-primary"
          />
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.zip,.txt,.md,.json,.csv"
            onChange={async (e) => {
              try { setDisputeFiles(await readFilesToBase64(e.target.files)); } catch (err: any) { toast.error(err.message); }
            }}
            className="text-secondary text-text-muted"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowDisputeForm(false)}>Cancel</Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={openDisputeMut.isPending}
              disabled={disputeDesc.trim().length < 5}
              onClick={() => openDisputeMut.mutate()}
            >
              Open dispute
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
