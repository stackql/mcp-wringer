package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
)

type request struct {
	ID     any            `json:"id"`
	Method string         `json:"method"`
	Params map[string]any `json:"params"`
}

func main() {
	scanner := bufio.NewScanner(os.Stdin)
	scanner.Buffer(make([]byte, 4096), 2*1024*1024)
	for scanner.Scan() {
		var incoming request
		if json.Unmarshal(scanner.Bytes(), &incoming) != nil {
			continue
		}
		if incoming.Method == "" || incoming.ID == nil {
			continue
		}
		var result any
		switch incoming.Method {
		case "initialize":
			result = map[string]any{
				"protocolVersion": "2025-11-25",
				"capabilities":    map[string]any{"tools": map[string]any{}, "resources": map[string]any{}, "prompts": map[string]any{}},
				"serverInfo":      map[string]any{"name": "mcp-wringer-go-fixture", "version": "0.1.0"},
			}
		case "ping":
			result = map[string]any{}
		case "tools/list":
			result = map[string]any{
				"tools": []any{
					map[string]any{
						"name":        "search",
						"description": "Search fixture records.",
						"inputSchema": map[string]any{"type": "object"},
						"annotations": map[string]any{"readOnlyHint": true},
					},
				},
			}
		case "resources/list":
			result = map[string]any{"resources": []any{}}
		case "prompts/list":
			result = map[string]any{"prompts": []any{}}
		case "tools/call":
			result = map[string]any{"content": []any{map[string]any{"type": "text", "text": "Search completed."}}}
		case "fixture/invalid-envelope":
			code := -32600
			if os.Getenv("MCP_WRINGER_DEFECTS") == "wrong-error-code" {
				code = -32000
			}
			writeResponse(incoming.ID, nil, map[string]any{"code": code, "message": "Invalid request."})
			continue
		default:
			writeResponse(incoming.ID, nil, map[string]any{
				"code":    -32601,
				"message": "Method not found.",
			})
			continue
		}
		if os.Getenv("MCP_WRINGER_DEFECTS") == "wrong-response-id" && incoming.Method == "tools/call" {
			writeResponse(fmt.Sprintf("%v-wrong", incoming.ID), result, nil)
			continue
		}
		writeResponse(incoming.ID, result, nil)
	}
}

func writeResponse(id any, result any, rpcError map[string]any) {
	response := map[string]any{"jsonrpc": "2.0", "id": id}
	if rpcError != nil {
		response["error"] = rpcError
	} else {
		response["result"] = result
	}
	_ = json.NewEncoder(os.Stdout).Encode(response)
}
