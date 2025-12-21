import React from 'react';
export default function TimeRangePicker({value, onChange}){
    return(
        <button className="time-range-btn" onClick={() => onChange(value)}>
            Time Range
        </button>
    );
}