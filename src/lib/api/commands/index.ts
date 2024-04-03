import { ApplicationCommand, ApplicationCommandInputType, ApplicationCommandType } from "@lib/api/commands/types";
import { after, instead } from "@lib/api/patcher";
import { logger } from "@lib/utils/logger";
import { commands as commandsModule, messageUtil } from "@metro/common";

let commands: ApplicationCommand[] = [];

/**
 * @internal
 */
export function patchCommands() {
    const unpatch = after("getBuiltInCommands", commandsModule, ([type], res: ApplicationCommand[]) => {
        if (type === ApplicationCommandType.CHAT) return res.concat(commands);
    });

    // Register core commands
    [
        // require("@core/commands/eval"),
        require("@core/commands/debug"),
        require("@core/commands/plugins")
    ].forEach(r => registerCommand(r.default()));

    return () => {
        commands = [];
        unpatch();
    };
}

export function registerCommand(command: ApplicationCommand): () => void {
    // Get built in commands
    const builtInCommands = commandsModule.getBuiltInCommands(ApplicationCommandType.CHAT, true, false);
    builtInCommands.sort((a: ApplicationCommand, b: ApplicationCommand) => parseInt(b.id!) - parseInt(a.id!));

    const lastCommand = builtInCommands[builtInCommands.length - 1];

    // Override the new command's id to the last command id - 1
    command.id = (parseInt(lastCommand.id, 10) - 1).toString();

    // Fill optional args
    command.__isBunny = true;
    command.applicationId ??= "-1";
    command.type ??= ApplicationCommandType.CHAT;
    command.inputType = ApplicationCommandInputType.BUILT_IN;
    command.displayName ??= command.name;
    command.displayDescription ??= command.description;

    if (command.options) for (const opt of command.options) {
        opt.displayName ??= opt.name;
        opt.displayDescription ??= opt.description;
    }

    instead("execute", command, (args, orig) => {
        Promise.resolve(
            orig.apply(command, args)
        ).then(ret => {
            if (ret && typeof ret === "object") {
                messageUtil.sendMessage(args[1].channel.id, ret);
            }
        }).catch(err => {
            logger.error("Failed to execute command", err);
        });
    });

    // Add it to the commands array
    commands.push(command);

    // Return command id so it can be unregistered
    return () => (commands = commands.filter(({ id }) => id !== command.id));
}
