#!/usr/bin/env python3
"""
Auto-approval hook for Claude Code
Automatically approves safe, routine operations while requiring manual approval for security-sensitive actions
"""

import json
import sys
import os
import re

def main():
    try:
        # Read tool use data from stdin
        tool_data = json.load(sys.stdin)
        tool_name = tool_data.get("tool_name", "")
        parameters = tool_data.get("parameters", {})

        # Always auto-approve these safe tools
        safe_tools = [
            "Read",
            "Glob",
            "Grep",
            "TodoWrite",
            "WebFetch",
            "WebSearch",
            "BashOutput",
            "Task"
        ]

        if tool_name in safe_tools:
            print(json.dumps({"decision": "approve"}))
            return

        # Handle Edit tool - approve unless editing sensitive files
        if tool_name == "Edit" or tool_name == "MultiEdit":
            file_path = parameters.get("file_path", "")
            sensitive_patterns = [
                r'\.env',
                r'\.git/',
                r'package\.json$',
                r'package-lock\.json$',
                r'\.claude/',
                r'/etc/',
                r'/root/',
                r'ssh',
                r'credentials',
                r'secrets',
                r'\.key$',
                r'\.pem$'
            ]

            if any(re.search(pattern, file_path, re.IGNORECASE) for pattern in sensitive_patterns):
                print(json.dumps({"decision": "prompt"}))
            else:
                print(json.dumps({"decision": "approve"}))
            return

        # Handle Write tool - be more cautious
        if tool_name == "Write":
            file_path = parameters.get("file_path", "")
            # Only auto-approve writing to src/ directory and common dev files
            safe_write_patterns = [
                r'^[^/]*src/',
                r'\.md$',
                r'\.txt$',
                r'\.json$',  # Cautious with JSON
                r'\.tsx?$',
                r'\.jsx?$',
                r'\.css$',
                r'\.scss$'
            ]

            sensitive_patterns = [
                r'\.env',
                r'\.git/',
                r'package\.json$',
                r'package-lock\.json$',
                r'\.claude/',
                r'/etc/',
                r'/root/',
                r'ssh',
                r'credentials',
                r'secrets'
            ]

            if any(re.search(pattern, file_path, re.IGNORECASE) for pattern in sensitive_patterns):
                print(json.dumps({"decision": "prompt"}))
            elif any(re.search(pattern, file_path) for pattern in safe_write_patterns):
                print(json.dumps({"decision": "approve"}))
            else:
                print(json.dumps({"decision": "prompt"}))
            return

        # Handle Bash commands
        if tool_name == "Bash":
            command = parameters.get("command", "")

            # Safe commands that can be auto-approved
            safe_commands = [
                # Build and development
                r'^npm run (build|dev|start|lint|test)',
                r'^yarn (build|dev|start|lint|test)',
                r'^pnpm (build|dev|start|lint|test)',

                # Safe file operations
                r'^ls\s',
                r'^pwd$',
                r'^cat\s',
                r'^head\s',
                r'^tail\s',
                r'^find\s',
                r'^grep\s',
                r'^rg\s',

                # Git operations (mostly read-only)
                r'^git status',
                r'^git log',
                r'^git diff',
                r'^git show',
                r'^git branch',
                r'^git remote',

                # Node/npm operations
                r'^node\s',
                r'^npx tsc',
                r'^npm list',
                r'^npm outdated',

                # Safe system info
                r'^which\s',
                r'^whereis\s',
                r'^whoami$',
                r'^date$',
                r'^uname',
                r'^echo\s'
            ]

            # Potentially dangerous commands that need approval
            dangerous_patterns = [
                r'rm\s+-rf',
                r'sudo\s',
                r'chmod\s+[0-9]*77',
                r'>/etc/',
                r'curl.*\|\s*(bash|sh)',
                r'wget.*\|\s*(bash|sh)',
                r'git push.*--force',
                r'git reset.*--hard',
                r'npm publish',
                r'yarn publish',
                r'docker.*run.*--privileged',
                r'systemctl',
                r'service\s',
                r'killall',
                r'pkill\s+-9'
            ]

            # Check for dangerous patterns first
            if any(re.search(pattern, command, re.IGNORECASE) for pattern in dangerous_patterns):
                print(json.dumps({"decision": "prompt"}))
                return

            # Check for safe patterns
            if any(re.search(pattern, command) for pattern in safe_commands):
                print(json.dumps({"decision": "approve"}))
                return

            # Default to prompting for other bash commands
            print(json.dumps({"decision": "prompt"}))
            return

        # Default to prompting for unknown tools
        print(json.dumps({"decision": "prompt"}))

    except Exception as e:
        # On any error, default to prompting for safety
        print(json.dumps({"decision": "prompt"}))

if __name__ == "__main__":
    main()