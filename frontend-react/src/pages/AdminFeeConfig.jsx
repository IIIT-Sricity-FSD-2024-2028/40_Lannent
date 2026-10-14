/**
 * LANNENT — AdminFeeConfig (Fee Configuration)
 * Converted from front-end/pages/admin-fee-config.html.
 *
 * Every rate the platform charges, editable by the revenue admin. A worked
 * example on the right recalculates as you type, before anything is saved.
 */
import { useRef, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import EmptyState from '../components/EmptyState';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './AdminFeeConfig.css?raw';

const money = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const r2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
const band = n => n === Infinity || n === null || n > 1e9 ? 'above' : '$' + Number(n).toLocaleString();
const TIER_LABELS = ['first band', 'middle band', 'top band'];

/** The server's config in the same shape the form edits. */
function serverShape(c) {
  return {
    depositPercent: c.deposit.percent,
    depositFixed: c.deposit.fixed,
    clientMarketplacePercent: c.clientMarketplace.percent,
    expertServicePercent: c.expertService.percent,
    withdrawalPercent: c.withdrawal.percent,
    withdrawalFixed: c.withdrawal.fixed,
    workerServicePercents: c.workerService.map(t => t.percent),
    contractInitiationFees: c.contractInitiation.map(t => t.fee),
  };
}

/** Input values (as typed) for every rate field, keyed by input id. */
function formValuesFrom(c) {
  const s = serverShape(c);
  const values = {
    depositPercent: s.depositPercent, depositFixed: s.depositFixed,
    marketplacePercent: s.clientMarketplacePercent, expertPercent: s.expertServicePercent,
    withdrawalPercent: s.withdrawalPercent, withdrawalFixed: s.withdrawalFixed,
  };
  s.workerServicePercents.forEach((p, i) => { values['workerTier' + i] = p; });
  s.contractInitiationFees.forEach((f, i) => { values['initBand' + i] = f; });
  Object.keys(values).forEach(k => { values[k] = String(values[k]); });
  return values;
}

/** One labelled rate input ("$ [ 0.30 ]" or "[ 2.9 ] %"). */
function NumRow({ id, label, note, unit, value, onChange }) {
  return (
    <div className="fc-row">
      <label htmlFor={id}>
        {label}
        <span className="fc-note">{note}</span>
      </label>
      <span className="fc-unit">{unit === '%' ? '' : '$'}</span>
      <input className="fc-input" id={id} type="number" min="0" step="0.01" value={value} onChange={e => onChange(id, e.target.value)} />
      <span className="fc-unit">{unit === '%' ? '%' : ''}</span>
    </div>
  );
}

/** The worked example, computed from the draft rates. */
function WorkedExample({ draft }) {
  const depFee = r2(1000 * (draft.depositPercent / 100) + draft.depositFixed);
  const mkt = r2(2500 * (draft.clientMarketplacePercent / 100));
  const init = draft.contractInitiationFees[2];                    // the $2k–$10k band
  const wFee = r2(800 * (draft.workerServicePercents[1] / 100));   // the mid tier
  const eFee = r2(300 * (draft.expertServicePercent / 100));
  const wd = r2(Math.max(500 * (draft.withdrawalPercent / 100) + draft.withdrawalFixed, 0.25));

  const row = (label, value, kind = '') => (
    <div className={'fc-ex-row' + (kind ? ' fc-ex-' + kind : '')}>
      <span>{label}</span>
      <span className="v">{value}</span>
    </div>
  );

  return (
    <>
      <div className="fc-ex-title">Client tops up $1,000</div>
      {row('Charged', money(1000))}
      {row('Processing fee', `−${money(depFee)}`, 'fee')}
      {row('Credited to wallet', money(1000 - depFee), 'net')}

      <div className="fc-ex-title">Funding a $2,500 project</div>
      {row('Into escrow', money(2500))}
      {row('Marketplace fee', `+${money(mkt)}`, 'fee')}
      {row('Contract initiation', `+${money(init)}`, 'fee')}
      {row('Client pays', money(2500 + mkt + init), 'net')}

      <div className="fc-ex-title">Releasing an $800 milestone</div>
      {row('From escrow', money(800))}
      {row('Service fee (mid tier)', `−${money(wFee)}`, 'fee')}
      {row('Worker receives', money(800 - wFee), 'net')}

      <div className="fc-ex-title">Paying a $300 audit</div>
      {row('Commission', `−${money(eFee)}`, 'fee')}
      {row('Reviewer receives', money(300 - eFee), 'net')}

      <div className="fc-ex-title">Worker withdraws $500</div>
      {row('Payout fee', `−${money(wd)}`, 'fee')}
      {row('Reaches their bank', money(500 - wd), 'net')}
    </>
  );
}

export default function AdminFeeConfig() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Fee Configuration — Lannent');
  const role = (Auth.getCurrentUser() || {}).role;

  const [cfg, setCfg] = useState(() => Store.getFeeConfig());   // what the server currently has
  const [values, setValues] = useState(() => (cfg ? formValuesFrom(cfg) : {}));
  const dirtyNote = useRef('');

  if (!cfg) {
    return (
      <>
        <PageStyle css={pageCss} />
        <EmptyState
          role={role} activePath="/admin-fee-config" pageTitle="Fee Configuration"
          message="Fee rates could not be loaded. Check that the API is running, then reload."
          linkHref="/admin-dashboard" linkLabel="Back to Dashboard"
        />
      </>
    );
  }

  // The local edits, in the server's shape
  const num = id => parseFloat(values[id]);
  const draft = {
    depositPercent: num('depositPercent'),
    depositFixed: num('depositFixed'),
    clientMarketplacePercent: num('marketplacePercent'),
    expertServicePercent: num('expertPercent'),
    withdrawalPercent: num('withdrawalPercent'),
    withdrawalFixed: num('withdrawalFixed'),
    workerServicePercents: cfg.workerService.map((_, i) => num('workerTier' + i)),
    contractInitiationFees: cfg.contractInitiation.map((_, i) => num('initBand' + i)),
  };
  const bad = Object.values(draft).flat().some(v => typeof v !== 'number' || isNaN(v) || v < 0);
  const changed = JSON.stringify(draft) !== JSON.stringify(serverShape(cfg));
  // While a rate is invalid the "Unsaved changes" note keeps its last value (as before).
  if (!bad) dirtyNote.current = changed ? 'Unsaved changes' : '';

  const setValue = (id, value) => setValues(v => ({ ...v, [id]: value }));

  function saveConfig() {
    if (bad) { Validate.toast('Every rate must be zero or greater.', 'error'); return; }
    const result = Store.updateFeeConfig(draft);
    if (!result) { Validate.toast('Could not save the fee configuration.', 'error'); return; }
    setCfg(result);
    Validate.toast('Fee rates saved. They apply to future charges only.', 'success');
  }

  function resetForm() {
    setValues(formValuesFrom(cfg));
  }

  const rowProps = id => ({ id, value: values[id], onChange: setValue });

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role={role} activePath="/admin-fee-config" pageTitle="Fee Configuration" pageSubtitle="Every rate the platform charges">
        <div className="fc-layout">
          <div>
            <div className="fc-card">
              <h2>Money entering and leaving</h2>
              <p className="hint">Charged when a client tops up a wallet, and when anyone withdraws to an external account.</p>
              <NumRow {...rowProps('depositPercent')} label="Deposit processing rate" note="Percentage of the amount deposited" unit="%" />
              <NumRow {...rowProps('depositFixed')} label="Deposit fixed fee" note="Flat amount added to every deposit" unit="$" />
              <NumRow {...rowProps('withdrawalPercent')} label="Withdrawal payout rate" note="Percentage of the amount withdrawn" unit="%" />
              <NumRow {...rowProps('withdrawalFixed')} label="Withdrawal fixed fee" note={`Flat amount, with a ${money(cfg.withdrawal.min)} minimum`} unit="$" />
            </div>

            <div className="fc-card">
              <h2>What the client pays</h2>
              <p className="hint">Charged on top of the project budget when a worker is hired.</p>
              <NumRow {...rowProps('marketplacePercent')} label="Marketplace fee" note="Percentage of the project budget" unit="%" />
              {cfg.contractInitiation.map((t, i) => (
                <NumRow
                  key={i}
                  {...rowProps('initBand' + i)}
                  label={`Contract initiation — up to ${band(t.upTo)}`}
                  note={i === cfg.contractInitiation.length - 1 ? 'Budgets above the previous band' : 'One-time fee per contract'}
                  unit="$"
                />
              ))}
            </div>

            <div className="fc-card">
              <h2>What providers pay</h2>
              <p className="hint">Deducted from a payout before it reaches the recipient. The worker tier is chosen by their lifetime billings with that client, so long relationships get cheaper.</p>
              {cfg.workerService.map((t, i) => (
                <NumRow
                  key={i}
                  {...rowProps('workerTier' + i)}
                  label={`Worker service fee — ${TIER_LABELS[i] || 'band ' + (i + 1)}`}
                  note={`Applies up to ${band(t.upTo)} of lifetime billings`}
                  unit="%"
                />
              ))}
              <NumRow {...rowProps('expertPercent')} label="Reviewer commission" note="Percentage of an agreed audit fee" unit="%" />
            </div>

            <div className="fc-card">
              <div className="fc-actions">
                <button className="btn-primary" onClick={saveConfig}>Save rates</button>
                <button className="btn-outline" onClick={resetForm}>Discard changes</button>
                <span className="fc-dirty" id="fcDirty">{dirtyNote.current}</span>
              </div>
              <p className="hint" style={{ margin: '14px 0 0' }}>Changes apply to future charges only — revenue already recorded keeps the rate it was charged at.</p>
            </div>
          </div>

          <div className="fc-example">
            <div className="fc-card">
              <h2>What this costs, worked through</h2>
              <p className="hint">Updates as you type, before anything is saved.</p>
              <div id="fcExample">
                {bad
                  ? <div style={{ fontSize: 13, color: '#b91c1c' }}>Every rate must be zero or greater.</div>
                  : <WorkedExample draft={draft} />}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
