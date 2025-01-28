
# MyBBBridge - Professional MyBB Development Extension for VSCode

A professional-grade VSCode extension designed for MyBB theme and template development, offering advanced template management, intelligent versioning, live cache refresh, and seamless database integration.  Originally developed by LeMiNaW I've been improving it for my specific usecases.  Ensure cacheform.php and cachecss are uploaded to root mybb dir.   Handlers for clearing stylesheet cache on save.

## Core Features

### Template Management

#### Smart Template Organization
- **Hierarchical Structure**
  - `/template_sets/<set_name>/<group_name>/template.html`
  - Automatic categorization based on MyBB's native group system
  - Intelligent handling of global templates (sid = -2)
  - Proper inheritance tracking for custom templates

#### Template Versioning
- **Version Control**
  - Automatic version tracking for each template
  - Maintains MyBB version compatibility information
  - Proper handling of template inheritance from master templates
  - Version conflict detection and resolution

#### Template Inheritance
- **Master Template Integration**
  - Proper handling of global templates (sid = -2)
  - Automatic conversion of inherited templates to custom versions
  - Smart detection of template modifications
  - Maintains MyBB's template inheritance system

#### Template Groups
- **Automatic Categorization**
  - Calendar Templates
  - Forum Display Templates
  - User CP Templates
  - Global Templates
  - Header/Footer Templates
  - Navigation Templates
  - And all standard MyBB template groups
  - Smart handling of ungrouped templates

### Style Management

#### Theme Organization
- **Clean Structure**
  - `/styles/<theme_name>/stylesheet.css`
  - Automatic theme detection
  - Smart stylesheet management
  - Version-aware updates

#### Cache Management
- **Real-time Updates**
  - Automatic cache refresh on save
  - Theme-specific cache handling
  - Fail-safe cache recovery
  - Production-safe cache updates

### Database Integration

#### Automatic Synchronization
- **Real-time Database Updates**
  - Template modifications are instantly saved
  - Smart SID management
  - Proper handling of template inheritance
  - Version-aware updates

#### Template Set Management
- **Smart Template Set Handling**
  - Create and modify template sets
  - Import existing template sets
  - Export template sets to database
  - Proper versioning and inheritance

## Technical Details

### Template Inheritance System
The extension properly handles MyBB's template inheritance system:
- Master templates (sid = -2)
- Global templates
- Custom templates
- Modified templates appear green in MyBB ACP
- Proper SID management for inheritance

### File Organization
```
workspace/
├── template_sets/
│   └── <template_set_name>/
│       ├── Calendar Templates/
│       ├── Forum Display Templates/
│       ├── Global Templates/
│       └── [Other Template Groups]/
└── styles/
    └── <theme_name>/
        └── [stylesheets]
```     
<img src="https://i.imgur.com/MoDFqB9.png"></img>
### Version Control
- Tracks template versions
- Maintains compatibility with MyBB versions
- Smart handling of template modifications
- Proper inheritance tracking

## Setup Guide

### Installation

1. Install via VSCode Marketplace
2. Create workspace configuration
3. Configure database connection

### Configuration

Create `.vscode/mbbb.json`:
```json
{
    "database": {
        "host": "localhost",
        "port": 3306,
        "database": "mybb",
        "prefix": "mybb_",
        "user": "root",
        "password": ""
    },
    "mybbVersion": 1860,
    "mybbUrl": "http://localhost",
    "autoUpload": true,
    "logFilePath": "path/to/logs",
    "token": ""
}
```

#### Configuration Options
- **database**: Database connection details
- **mybbVersion**: Target MyBB version for templates
- **mybbUrl**: MyBB installation URL for cache management
- **autoUpload**: Enable automatic database updates
- **logFilePath**: Path for extension logs
- **token**: Optional authentication token

### Commands

#### Template Management
- `MyBBBridge: Load Template Set`
  - Downloads complete template set
  - Organizes into proper groups
  - Maintains version information
  - Preserves inheritance data

#### Style Management
- `MyBBBridge: Load Style`
  - Downloads theme stylesheets
  - Maintains cache information
  - Preserves theme hierarchy

#### Configuration
- `MyBBBridge: Create Config`
  - Creates configuration file
  - Sets up default options
  - Configures database connection

### Auto-Save Features

#### Template Auto-Save
- Automatic database synchronization
- Proper version management
- Inheritance tracking
- Cache updates

#### Style Auto-Save
- Automatic stylesheet updates
- Cache refresh
- Theme-aware updates

## Special Features

### Template Inheritance Management
- Proper handling of master templates
- Smart SID management
- Version-aware modifications
- Inheritance tracking

### Cache Management
- Real-time cache updates
- Theme-specific handling
- Fail-safe mechanisms
- Production safeguards

### Error Handling
- Detailed error logging
- Smart error recovery
- Database connection management
- Cache failure recovery

## Best Practices

### Template Development
1. Always use template sets
2. Maintain proper group structure
3. Be aware of template inheritance
4. Monitor version compatibility

### Style Development
1. Use theme-specific organization
2. Monitor cache status
3. Test cache updates
4. Maintain version compatibility

## Requirements
- VSCode 1.60.0 or higher
- MyBB 1.8.x
- PHP 7.4 or higher (for cache management)
- MySQL 5.7 or higher

## Known Issues
- Document any known issues or limitations

## Security Considerations

### Configuration Security
- Never commit your `mbbb.json` with real credentials
- Use environment variables for sensitive data in production
- Keep your authentication token private

### Best Practices
1. Always use HTTPS for MyBB URL
2. Regularly rotate authentication tokens
3. Use restricted database users with minimal privileges
4. Keep logs in a secure location outside web root

### Database Access
Configure a database user with minimal required privileges:
```sql
GRANT SELECT, UPDATE ON mybb_templates TO 'mybbbridge'@'localhost';
GRANT SELECT, UPDATE ON mybb_themes TO 'mybbbridge'@'localhost';
```

### Production Use
1. Enable authentication token validation
2. Configure secure log locations
3. Use environment-specific configurations

- If you would like to use this extension on a live server, not a localhost (such as wamp), you will need to create a deploy.yml, make your forum a github repo, and create a script to utilize a secure token to make the adjustments in the database.   For security reasons I am encouraging everybody to make their own setup.  You can achieve true CI/CD MyBB development with this extension and some extra work.


## Development Guide

### Getting Started with Development

#### Setup Development Environment
1. Clone the repository
```bash
git clone https://github.com/paxocial/vscode-mybbbridge.git
cd vscode-mybbbridge
```

2. Open in VSCode
```bash
code .
```

3. Install dependencies
```bash
npm install
```

4. Install required VSCode extensions
- TypeScript and JavaScript Language Features
- ESLint
- Debugger for Chrome (optional, for debugging)

### Project Structure
```
vscode-mybbbridge/
├── src/                     # Source code
│   ├── events.ts           # Event handlers (save events, etc.)
│   ├── extension.ts        # Extension entry point
│   ├── loadCommands.ts     # Template/style loading commands
│   ├── MyBBThemes.ts       # Core MyBB interaction logic
│   ├── TemplateGroupManager.ts  # Template organization logic
│   ├── utilCommands.ts     # Utility commands
│   └── utils.ts            # Helper functions
├── resources/              # Static resources
│   └── templatecontext.json # Template grouping definitions
├── .vscode/               # VSCode configuration
└── package.json           # Extension manifest
```

### Development Workflow

1. **Make Changes**
   - Modify source files in `src/`
   - Add new features
   - Fix bugs

2. **Compile and Test**
```bash
# Compile TypeScript
npm run compile

# Watch for changes during development
npm run watch

# Run tests
npm test
```

3. **Debug the Extension**
   - Press F5 in VSCode to launch extension development host
   - Set breakpoints in TypeScript files
   - Use Debug Console for logging
   - Check Output panel for extension logs

4. **Package the Extension**
```bash
# Create VSIX package
vsce package
```

### Key Components

#### Extension Entry Point (extension.ts)
- Handles extension activation/deactivation
- Registers commands
- Sets up event listeners
- Initializes logging

#### Event Handler (events.ts)
- Manages file save events
- Handles template/style updates
- Triggers cache refresh

#### Template Management (MyBBThemes.ts)
- Handles database interactions
- Manages template inheritance
- Controls versioning
- Handles cache updates

#### Template Organization (TemplateGroupManager.ts)
- Manages template grouping
- Handles template categorization
- Controls folder structure
- Manages language strings

### Adding New Features

#### Add New Command
1. Create command function in appropriate file
```typescript
export async function myNewCommand() {
    // Command implementation
}
```

2. Register in extension.ts
```typescript
context.subscriptions.push(
    vscode.commands.registerCommand('extension.myNewCommand', myNewCommand)
);
```

3. Add to package.json
```json
{
    "contributes": {
        "commands": [
            {
                "command": "extension.myNewCommand",
                "title": "MyBBBridge: My New Command"
            }
        ]
    }
}
```

#### Add New Template Group
1. Update templatecontext.json
```json
{
    "group": "My New Group",
    "templates": [
        "template_name1",
        "template_name2"
    ]
}
```
2. You can create a customize templatecontext.json file by using an AI like chatgpt o1-mini.  Just expand all templates and copy and paste into the AI, ask for a json list just like this one.  

2. Add to TemplateGroupManager.ts langMap if needed (This is only for templates that use a <lang:name> naming structure in the DB, typically only default mybb templates)
```typescript
private static langMap: { [key: string]: string } = {
    'group_mynewgroup': "My New Group",
    // ... existing mappings
};
```

### Testing

#### Run Tests
```bash
npm test
```

#### Add New Tests
1. Create test file in `test/` directory
2. Use VSCode's extension testing framework
```typescript
suite('My Test Suite', () => {
    test('My Test Case', async () => {
        // Test implementation
    });
});
```

### Common Development Tasks

#### Adding Database Support for New Features
1. Add new methods to MyBBSet class
2. Implement in MyBBTemplateSet or MyBBStyle
3. Add error handling
4. Update types

#### Modifying Template Organization
1. Update TemplateGroupManager patterns
2. Modify categorization logic
3. Update group naming
4. Test with various templates

#### Adding New Events
1. Create event handler
2. Register in extension.ts
3. Add error handling
4. Test thoroughly

### Tips and Tricks

1. **Development Speed**
   - Use `npm run watch` during development
   - Keep Extension Development Host window open
   - Use VSCode's Debug Console

2. **Debugging**
   - Add console.log statements with descriptive prefixes
   - Use VSCode's breakpoint system
   - Check Output panel > MyBBBridge channel

3. **Testing Changes**
   - Test with different MyBB versions
   - Test with various template sets
   - Verify template inheritance
   - Check cache behavior

4. **Common Issues**
   - Database connection handling
   - Template inheritance edge cases
   - Cache refresh timing
   - File system permissions

### Publishing Updates

1. **Update Version**
```bash
npm version patch|minor|major
```

2. **Package Extension**
```bash
vsce package
```

3. **Test VSIX Package**
   - Install in fresh VSCode instance
   - Test all features
   - Verify documentation

4. **Publish**
```bash
vsce publish
```

### Best Practices

1. **Code Style**
   - Follow existing patterns
   - Use TypeScript features
   - Document complex logic
   - Add type definitions

2. **Error Handling**
   - Use try-catch blocks
   - Provide user feedback
   - Log errors appropriately
   - Handle edge cases

3. **Documentation**
   - Update README.md
   - Document new features
   - Update API documentation
   - Add code comments

4. **Testing**
   - Write unit tests
   - Test edge cases
   - Verify MyBB compatibility
   - Test different configurations


## License
[License.md]
