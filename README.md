# **Patrick**

## **Inspiration**

### **Context Is All You Need**

LLMs are kind of dumb. They excel at predicting the next token, but if you ask them about anything outside of their training set, you're SOL. Recently, this problem has been tackled via function calling, but setting these tools up has proved to be quite the ordeal. Thus, Patrick started with a simple goal: build an agentic, modular, and context-aware office assistant with access to all of your tools and files!

That sentence is describing a system—Patrick—that acts as a kind of bridge between LLMs (like GPT) and productivity tools (like Google Docs, Excel, Notion, Slack, etc.). Let's break it down:

🔧 **"Patrick leverages the Model Context Protocol"**  
Model Context Protocol (MCP) is likely a standard or framework that helps large language models safely and efficiently communicate with external tools and data.  
Think of it as a translator or middle layer that lets the AI understand what's happening in another app (like your calendar or spreadsheet) and respond in a relevant way.

🧠 **"to enable real-time, secure communication between LLMs and productivity tools"**  
Patrick can:
- Pull data from your tools (e.g., read your emails, notes, to-do lists).
- Send actions back (e.g., schedule a meeting, summarize a doc, autofill a table).
- And it does this securely, without leaking sensitive info or losing context.

⚙️ **"It helps users automate tasks, generate content, analyze data, and streamline workflows"**  
Patrick isn't just reading data—it acts like a smart assistant to:
- Automate tasks (e.g., “Create weekly report based on this spreadsheet”).
- Generate content (e.g., “Write a blog post based on these notes”).
- Analyze data (e.g., “Explain the trends in this chart”).
- Streamline workflows (e.g., “Summarize every new task added to Trello daily”).

🧠 **"efficient, context-aware interactions"**  
Patrick remembers the context of what you're doing—so it's not just blindly answering prompts.  
Example: If you’re editing a Google Doc and say “Turn this into bullet points,” Patrick knows “this” means the current paragraph you're on.

## **How We Built It**

We created Patrick, a smart desktop assistant, by connecting large language models (LLMs) to popular productivity apps like Excel, PowerPoint, and Email using a framework called the Model Context Protocol (MCP).

Here's how our system is structured:

✅ **MCP Client**  
This is the frontend or interface that users interact with.  
It sends user instructions (like "create a presentation" or "read my email") to the backend and displays the response.

✅ **MCP Servers**  
These are modular backend components that give the LLM access to specific applications.  
For example:
- The Gmail MCP server lets the model read/send emails.
- The Excel MCP server allows reading and writing Excel files.
- The PowerPoint MCP server enables creating and editing slides.  
Each server uses a function-calling interface, meaning the model can request actions (like sending an email) by calling specific functions.

✅ **LLM API**  
This is the actual AI model that generates responses based on the user's input.  
We used Google’s Gemini 2.0 Flash, a powerful LLM with built-in function-calling support.  
MCP is model-agnostic, so you could use any LLM that supports function calls (like OpenAI, Claude, etc.).

## **Challenges We Ran Into**

MCP is very new — it was just released in November 2024.  
Because of that, there aren’t many tutorials, libraries, or best practices.  
We had to choose between two competing approaches to build MCP servers:  
- FastMCP and  
- MCP SDK

This led to compatibility problems and bugs, since the ecosystem isn’t fully mature yet.  
Despite that, we figured things out through a lot of trial and error.

## **Accomplishments We’re Proud Of**

We successfully built multiple working MCP servers, each with real functionality:  
✅ **Gmail MCP**: Can read emails, send new ones, and handle attachments.  
✅ **Excel MCP**: Can create spreadsheets, read data, and write updates.  
✅ **PowerPoint MCP**: Can generate and edit slide decks.  
This shows that LLMs can interact with real tools — not just answer questions!

## **What We Learned**

MCP doesn't tell the AI what to do — it simply gives it a list of tools (functions).  
The LLM must figure out which tool to use, when, and how — just like a human assistant.

We tested several LLMs:
- Qwen2.5:7b
- Llama 3.2
- Gemini 2.0 Flash (performed the best)

This taught us a lot about how different models reason about tasks and make decisions.

## **What’s Next for Patrick**

- Add support for more tools by building new MCP servers.
- Improve security, especially for sensitive actions like sending emails.
- Package the entire system into one executable file, so it’s easy to install and run.

## **Built With**

- **ElectronJS**: Used to create a clean, modern desktop app that runs on Windows, macOS, and Linux.
- **Model Context Protocol (MCP)**: The framework we used to connect the AI model to external tools.
- **Google Gemini 2.0 Flash**: The AI model that powers Patrick’s natural language abilities.
- **Node.js, React, and Python**: Core programming tools and frameworks used for building the client and server logic.
