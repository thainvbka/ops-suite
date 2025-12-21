import React from 'react';

export default function Panel({ panel }) {

  return <div className="panel">Panel: {panel?.title || 'Untitled'}</div>;

}

 