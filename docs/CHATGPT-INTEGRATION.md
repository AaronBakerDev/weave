# ChatGPT Integration Guide

## Overview

Weave integrates with ChatGPT through the Model Context Protocol (MCP), allowing you to capture, reflect on, and recall memories naturally through conversation. Instead of filling out forms or navigating UIs, you can simply talk to ChatGPT about your experiences, and it will help you build a rich, layered memory system.

## How It Works

The Weave system uses a **layered memory architecture**:

1. **Create** - Start with a blank memory (just a title)
2. **Core** - Set the narrative core (the essential story)
3. **Lock** - Make the core immutable
4. **Layer** - Add context, reflections, images over time
5. **Weave** - Connect related memories together
6. **Search** - Find memories by meaning, not just keywords

## Conversational Patterns

### Capturing New Memories

**Simple capture:**
```
User: "I want to remember my conversation with Sarah today about her startup idea."

ChatGPT: "I'll help you create that memory. Let me capture the details."
→ Creates memory with title "Conversation with Sarah about startup"
→ Prompts for narrative details
→ Sets core and locks it
```

**Detailed capture:**
```
User: "Save this memory: Today I met with the design team to review the new
feature mockups. The session was at our downtown office, and the key people
were Maria (lead designer) and Tom (product manager). We made some breakthrough
decisions about the navigation flow."

ChatGPT: "I've captured that memory with:
- Title: Design team feature review
- Core narrative: [your description]
- People: Maria (lead designer), Tom (product manager)
- Location: Downtown office
- Would you like me to lock this core or make any adjustments?"
```

### Adding Reflections & Layers

**Text layers (reflections, updates):**
```
User: "Add to my memory about Sarah's startup: She actually built a prototype
this week! Her energy is amazing."

ChatGPT: "I've added that reflection as a new layer to your memory about
Sarah's startup."
→ Searches for the memory
→ Appends TEXT layer with the reflection
```

**Image layers:**
```
User: "I want to add a photo to my beach trip memory."

ChatGPT: "I can help with that. Please upload the image, and I'll attach it
as a layer to your beach trip memory."
→ User uploads image
→ Creates ARTIFACT layer linked to the image
```

### Searching & Recalling

**Natural language search:**
```
User: "Remind me about times I felt stuck on a problem."

ChatGPT: "I found 5 memories related to feeling stuck on problems:"
→ Uses associative search with query "stuck on problem"
→ Returns relevant memories with excerpts
→ Shows titles, dates, and relevance scores
```

**Specific topic search:**
```
User: "What do I have saved about product launches?"

ChatGPT: "Here are your memories about product launches:"
→ Semantic search for "product launches"
→ Lists matching memories
→ Can dive into details on request
```

### Connecting Memories (Weaving)

**Explicit connections:**
```
User: "Connect my memory about Sarah's startup to the one about taking risks
in business."

ChatGPT: "I've created a weave between those memories with relation type
'relates_to'. Would you like to add a note about why they're connected?"
```

**Discovery connections:**
```
User: "This conversation reminds me of my chat with Alex last month."

ChatGPT: "Would you like me to create a weave between this memory and your
conversation with Alex? I can link them as 'inspired_by' or 'relates_to'."
```

### Privacy & Sharing

**Setting permissions:**
```
User: "Make my beach trip memory private."

ChatGPT: "I've set your beach trip memory to PRIVATE. Only you can view it."

User: "Actually, share it with Sarah."

ChatGPT: "I've updated the permissions to SHARED and added Sarah to the
allowed users list. She can view but not edit."
```

## Example Conversation Flow

```
User: "I had a really meaningful conversation today that I want to remember."

ChatGPT: "I'd be happy to help you capture that. What would you like to
title this memory?"

User: "Call it 'Coffee with Dad - career advice'"

ChatGPT: "Great title. Can you tell me about the conversation? What happened,
how did you feel, what made it meaningful?"

User: "We met at our usual spot, the cafe near his office. I've been feeling
uncertain about switching careers, and he shared his own story of making a
big pivot in his 40s. He said something that really stuck: 'The right time
is when you can't stop thinking about it.' That's exactly where I am now."

ChatGPT: "That's a powerful memory. I've captured it with:

**Memory: Coffee with Dad - career advice**
- **Core narrative:** Your description above
- **People:** Dad
- **Location:** Cafe near his office
- **Key insight:** 'The right time is when you can't stop thinking about it'

I've locked the core. You can add reflections or updates as layers anytime.
Would you like to add any tags or connect this to other career-related
memories?"

User: "Yes, connect it to my memory about applying to the bootcamp."

ChatGPT: "Done! I've woven those memories together with relation type
'inspired_by' - showing how your dad's advice influenced your decision
to apply to the bootcamp."
```

## Response Format

When Weave completes an action through ChatGPT, responses should:

1. **Confirm the action** - "I've created that memory..." / "I've added a layer..."
2. **Show key details** - Title, excerpt, people involved
3. **Provide next steps** - "Would you like to..." / "You can also..."
4. **Include links** - Direct links to view in the full UI

### Example Response Format

```
✓ Memory created: "Team brainstorm session"

Core narrative: We gathered to brainstorm the Q4 roadmap... [excerpt]
People: Maria (designer), Tom (PM), Alex (eng)
Created: Oct 20, 2024

[View full memory](https://weave.app/memories/abc123)

Would you like to:
- Lock this core to make it immutable
- Add a reflection or update
- Connect it to related memories
```

## Privacy & Security

### Data Handling
- All memories are **user-owned** and stored securely
- ChatGPT only accesses memories through the MCP protocol
- No training data is collected from your memories
- You control visibility: PRIVATE, SHARED, or PUBLIC

### Permission Levels
- **PRIVATE**: Only you can see
- **SHARED**: Specific people you choose (view or edit)
- **PUBLIC**: Anyone with the link

### Editing vs. Viewing
- Locked cores are **immutable** - they cannot be changed
- To update a locked core, use "lift" to create a new draft
- Layers are always additive - they don't modify the core
- This preserves the integrity of your original memory

## Natural Language Commands

### Create & Capture
- "Remember this..."
- "Save this memory..."
- "I want to capture..."
- "Create a memory about..."

### Update & Reflect
- "Add to my memory about..."
- "Reflect on [memory]..."
- "Update my thought on..."
- "Looking back at [memory], I realize..."

### Search & Recall
- "Remind me about..."
- "What do I have saved about..."
- "Find memories related to..."
- "Show me when I thought about..."

### Connect & Weave
- "This reminds me of..."
- "Connect [memory A] and [memory B]..."
- "Link this to..."
- "How does this relate to [memory]?"

### Privacy & Sharing
- "Make [memory] private"
- "Share [memory] with [person]"
- "Who can see [memory]?"
- "Change permissions on..."

## Advanced Usage

### Multi-step Workflows

ChatGPT can guide you through complex memory creation:

```
User: "I want to document our product launch from planning to completion."

ChatGPT: "That sounds like a significant milestone! Let's create a rich
memory for this. I'll help you:

1. Create the core memory with the launch narrative
2. Add layers for each phase (planning, execution, results)
3. Link related memories (team meetings, customer feedback)
4. Attach any relevant documents or images

Let's start with the overall story - how did the launch go?"
```

### Batch Operations

```
User: "Find all my memories about the Q3 project and make them visible to
the team."

ChatGPT: "I found 12 memories related to the Q3 project. I'll update the
permissions on each one to SHARED with your team members. This may take
a moment..."

[Updates all 12 memories]

"Done! All 12 Q3 project memories are now shared with the team (view-only).
Would you like to enable editing on any of them?"
```

### Insights & Patterns

```
User: "What patterns do you see in my memories about learning new skills?"

ChatGPT: "Looking at your 8 memories tagged with learning new skills, I notice:

1. You often feel initial resistance but push through
2. Peer support is a key factor in your success
3. You prefer hands-on practice over reading documentation
4. Your breakthrough moments often happen in conversation

Would you like me to create a weave connecting these learning memories to
highlight this pattern?"
```

## Error Handling

### Graceful Failures

When something goes wrong, ChatGPT should:

1. **Explain the issue** - "I couldn't find a memory with that title..."
2. **Suggest alternatives** - "Did you mean [similar memory]?"
3. **Offer help** - "Would you like to search for it or create a new one?"

### Common Issues

**Memory not found:**
```
ChatGPT: "I couldn't find a memory with that exact title. Here are some
similar ones:
- Coffee with Dad - life advice
- Lunch with Dad - business discussion

Which one did you mean, or would you like to create a new memory?"
```

**Permission denied:**
```
ChatGPT: "I don't have permission to edit that memory. It appears to be
owned by another user who hasn't granted edit access. You can:
- Request edit access from the owner
- Create your own copy with a reflection layer"
```

**Core already locked:**
```
ChatGPT: "The core of this memory is locked. To make changes, I can:
- Create a 'lifted' version (new draft, preserves original)
- Add a new layer with updated thoughts
Which would you prefer?"
```

## Best Practices

### For Users

1. **Be specific** - More details make better memories
2. **Capture feelings** - Not just what happened, but how it felt
3. **Lock intentionally** - Lock cores when you're satisfied
4. **Layer generously** - Add reflections as thoughts evolve
5. **Weave connections** - Link related memories to see patterns

### For Developers

1. **Confirm actions** - Always show what was done
2. **Provide context** - Include relevant details in responses
3. **Suggest next steps** - Guide users forward
4. **Handle errors gracefully** - Offer alternatives, not dead ends
5. **Respect privacy** - Make permission levels clear

## What Makes Weave Different

### Traditional Note-Taking
- Linear, flat structure
- Edit in place (lose history)
- Organize by folders/tags
- Keyword search only

### Weave
- Layered, evolving structure
- Immutable cores + additive layers
- Organize by connections (weaves)
- Semantic, associative search
- Conversational interface

## Getting Started

To start using Weave through ChatGPT:

1. Ensure MCP integration is configured (see HOW-TO-USE-IN-CHATGPT.md)
2. Simply start a conversation: "I want to remember..."
3. Let ChatGPT guide you through the process
4. Build your memory over time with layers and connections

The system is designed to feel natural - like talking to a friend who helps
you remember and reflect on meaningful moments.
