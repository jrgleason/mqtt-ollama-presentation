'use client';

import {useState} from 'react';
import {cn} from '../lib/utils.js';
import {Bot, ChevronDown, ChevronUp, User} from 'lucide-react';

export function ChatMessage({message}) {
    const isUser = message.role === 'user';
    const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);

    const hasOpenThinkTag = message.content.includes('<think>');
    const hasCloseThinkTag = message.content.includes('</think>');
    const isThinkingInProgress = hasOpenThinkTag && !hasCloseThinkTag;

    const thinkingMatch = message.content.match(/<think>([\s\S]*?)<\/think>/);
    const thinkingContent = thinkingMatch ? thinkingMatch[1].trim() : null;

    const mainContent = message.content
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .replace(/<think>[\s\S]*$/g, '')
        .replace(/<\/think>/g, '')
        .trim();

    if (!mainContent && !thinkingContent) {
        return null;
    }

    return (
        <div className={cn('flex gap-4 items-start', isUser ? 'flex-row-reverse' : 'flex-row')}>
            <div
                className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md',
                    isUser ? 'bg-emerald-600' : 'bg-blue-600',
                )}
            >
                {isUser ? <User className="w-5 h-5 text-white"/> : <Bot className="w-5 h-5 text-white"/>}
            </div>

            <div className={cn('flex flex-col gap-2 max-w-[75%]', isUser ? 'items-end' : 'items-start')}>
                {(mainContent || (!isUser && thinkingContent && !isThinkingInProgress)) && (
                    <div
                        className={cn(
                            'rounded-3xl px-5 py-3 shadow-md',
                            isUser
                                ? 'bg-emerald-600 text-white rounded-tr-sm'
                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2 border-gray-200 dark:border-gray-700 rounded-tl-sm',
                        )}
                    >
                        {mainContent && (
                            <p className="text-base leading-relaxed whitespace-pre-wrap break-words">{mainContent}</p>
                        )}

                        {!isUser && thinkingContent && !isThinkingInProgress && (
                            <div
                                className={cn(mainContent ? 'mt-3 pt-3 border-t border-gray-200 dark:border-gray-700' : '')}>
                                <button
                                    type="button"
                                    onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                                >
                                    {isThinkingExpanded ? (
                                        <ChevronUp className="w-4 h-4"/>
                                    ) : (
                                        <ChevronDown className="w-4 h-4"/>
                                    )}
                                    <span className="font-medium">View thinking</span>
                                </button>

                                {isThinkingExpanded && (
                                    <div className="mt-2 rounded-lg px-3 py-2 bg-gray-100 dark:bg-gray-700/50">
                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words italic">
                                            {thinkingContent}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div
                    className={cn(
                        'flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 px-3',
                        isUser ? 'justify-end' : 'justify-start',
                    )}
                >
          <span>
            {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            })}
          </span>
                    {!isUser && message.duration && (
                        <>
                            <span>•</span>
                            <span className="font-medium">{(message.duration / 1000).toFixed(1)}s</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
