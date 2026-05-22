import './SurveyResults.css';

function BarChart({ counts, total }) {
  const entries = Object.entries(counts || {});
  const max = Math.max(...entries.map(([, c]) => c), 1);
  const denom = total > 0 ? total : max;

  return (
    <div className="survey-bars">
      {entries.map(([label, count]) => (
        <div key={label} className="survey-bar-row">
          <span className="survey-bar-label">{label}</span>
          <div className="survey-bar-track">
            <div
              className="survey-bar-fill"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="survey-bar-count">
            <strong>{count}</strong>
            {denom > 0 && (
              <span className="survey-bar-pct"> {Math.round((count / denom) * 100)}%</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function SurveyResults({ resultsData, responseCount }) {
  if (!resultsData?.results?.length) {
    return (
      <div className="survey-results-empty">
        <p>No responses yet.</p>
        {responseCount != null && (
          <p className="survey-results-empty-meta">{responseCount} response(s) so far</p>
        )}
      </div>
    );
  }

  return (
    <div className="survey-results">
      {resultsData.results.map((r) => (
        <div key={r.question_id} className="survey-result-card">
          <h4 className="survey-result-prompt">{r.prompt}</h4>
          {r.type === 'single' || r.type === 'multi' ? (
            <BarChart counts={r.counts} total={r.total || r.total_responses} />
          ) : null}
          {r.type === 'rating' && (
            <div className="survey-rating-result">
              {r.average != null && (
                <span className="survey-rating-badge">Average {r.average} / 5</span>
              )}
              <BarChart counts={r.distribution} total={r.total} />
            </div>
          )}
          {r.type === 'text' && (
            <ul className="survey-text-answers">
              {(r.answers || []).map((text, i) => (
                <li key={i}>{text}</li>
              ))}
              {(!r.answers || r.answers.length === 0) && (
                <li className="muted">No text answers</li>
              )}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

export default SurveyResults;
