
import React from 'react';
import { GrammarAnalysis } from '../types';
import ExerciseSection from './ExerciseSection';

interface AnalysisCardProps {
  analysis: GrammarAnalysis;
  onExerciseComplete: () => void;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ analysis, onExerciseComplete }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-2">
      <div className="p-4 bg-red-50 border-b border-red-100">
        <span className="text-xs font-bold uppercase tracking-wider text-red-500 mb-1 block">Original (原文)</span>
        <p className="text-slate-800 italic">"{analysis.original}"</p>
      </div>
      
      <div className="p-4 bg-emerald-50 border-b border-emerald-100">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1 block">Corrected (修正)</span>
        <p className="text-slate-900 font-semibold text-lg">"{analysis.corrected}"</p>
      </div>

      <div className="p-4 space-y-4">
        {analysis.explanation_en && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-600 mb-2">
              <i className="fas fa-graduation-cap"></i>
              English Explanation
            </h4>
            <p className="text-slate-700 text-sm leading-relaxed">{analysis.explanation_en}</p>
          </div>
        )}

        {analysis.explanation_zh && (
          <div className={analysis.explanation_en ? "pt-4 border-t border-slate-100" : ""}>
            <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-600 mb-2">
              <i className="fas fa-language"></i>
              中文解析
            </h4>
            <p className="text-slate-700 text-sm leading-relaxed">{analysis.explanation_zh}</p>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100">
          <div className="flex flex-wrap gap-2">
            {analysis.key_points.map((point, idx) => (
              <span key={idx} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
                {point}
              </span>
            ))}
          </div>
        </div>

        {analysis.exercise && (
          <ExerciseSection 
            exercise={analysis.exercise} 
            onCorrect={onExerciseComplete} 
          />
        )}
      </div>
    </div>
  );
};

export default AnalysisCard;
