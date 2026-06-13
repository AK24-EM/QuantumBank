import { useState } from 'react';
import { FileText, Download, Loader2, ShieldCheck } from 'lucide-react';
import type { Account, Transaction, User } from '../../types';
import { generateStatement } from '../../services/statementService';
import { formatDate } from '../../utils/format';

interface AccountStatementsProps {
  user: User;
  accounts: Account[];
  transactions: Transaction[];
}

export default function AccountStatements({ user, accounts, transactions }: AccountStatementsProps) {
  const [accountId, setAccountId] = useState(accounts.find((a) => !a.isLiability)?.id ?? accounts[0].id);
  const [dateFrom, setDateFrom] = useState('2026-05-01');
  const [dateTo, setDateTo] = useState('2026-06-12');
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const assetAccounts = accounts.filter((a) => !a.isLiability);

  const handleGenerate = async () => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;

    setGenerating(true);
    try {
      const { blob, filename } = await generateStatement({ user, account, transactions, dateFrom, dateTo });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setLastGenerated(filename);
    } finally {
      setGenerating(false);
    }
  };

  const previewCount = transactions.filter(
    (t) => t.accountId === accountId && t.date >= dateFrom && t.date <= dateTo && t.status === 'completed',
  ).length;

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-2xl border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Account Statements</h3>
            <p className="text-sm text-gray-500">On-demand PDF · Digitally signed · Compliance-ready</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
            >
              {assetAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} — {a.accountNumber}</option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
            <p><span className="font-medium text-gray-900">{previewCount}</span> completed transactions in selected range</p>
            <p className="text-xs text-gray-400 mt-1">Period: {formatDate(dateFrom)} — {formatDate(dateTo)}</p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || previewCount === 0}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {generating ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Generating PDF...</>
            ) : (
              <><Download className="w-5 h-5" /> Generate & Download Statement</>
            )}
          </button>

          {lastGenerated && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Digitally signed statement downloaded: <span className="font-mono text-xs">{lastGenerated}</span></span>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 leading-relaxed">
            Statements are produced server-side using PDF templating, branded with QuantumBank identity,
            and digitally signed. The same pipeline powers regulatory compliance reports.
          </p>
        </div>
      </div>
    </div>
  );
}
