import './SurveyResults.css';

function BarChart({ counts, total }) {
  const entries = Object.entries(counts || {});
  const max = Math.max(...entries.map(([, c]) => c), 1);
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
            {count}
            {total > 0 && ` (${Math.round((count / total) * 100)}%)`}
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
        {responseCount != null && <p className="survey-response-count">{responseCount} response(s)</p>}
      </div>
    );
  }

  return (
    <div className="survey-results">
      <p className="survey-response-count">{resultsData.response_count ?? responseCount ?? 0} response(s)</p>
      {resultsData.results.map((r) => (
        <div key={r.question_id} className="survey-result-block">
          <h4>{r.prompt}</h4>
          {r.type === 'single' || r.type === 'multi' ? (
            <BarChart counts={r.counts} total={r.total || r.total_responses} />
          ) : null}
          {r.type === 'rating' && (
            <div className="survey-rating-result">
              {r.average != null && (
                <p className="survey-rating-avg">Average: {r.average} / 5</p>
              )}
              <BarChart counts={r.distribution} total={r.total} />
            </div>
          )}
          {r.type === 'text' && (
            <ul className="survey-text-answers">
              {(r.answers || []).map((text, i) => (
                <li key={i}>{text}</li>
              ))}
              {(!r.answers || r.answers.length === 0) && <li className="muted">No text answers</li>}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

export default SurveyResults;
