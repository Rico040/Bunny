import { CardWrapper } from "@core/ui/components/AddonCard";
import { VdPluginManager, VendettaPlugin } from "@core/vendetta/plugins";
import { findAssetId } from "@lib/api/assets";
import { useProxy } from "@lib/api/storage";
import { showSheet } from "@lib/ui/sheets";
import { lazyDestructure } from "@lib/utils/lazy";
import { findByProps } from "@metro";
import { NavigationNative } from "@metro/common";
import { Card, IconButton, Stack, TableSwitch, Text } from "@metro/common/components";
import { createContext, memo, useContext } from "react";
import { Image, View } from "react-native";

import { usePluginCardStyles } from "./usePluginCardStyles";

const { useToken } = lazyDestructure(() => findByProps("useToken"));
const PluginContext = createContext<VendettaPlugin>(null!);
const usePlugin = () => useContext(PluginContext);

function Authors() {
    const plugin = usePlugin();
    const children: ReactNode[] = ["by "];

    const handlePress = (authorId: string | undefined) => {
        if (authorId) {
            if (!Users.getUser(authorId)) {
                AsyncUsers.fetchProfile(authorId).then(() => {
                    Profiles.showUserProfile({ userId: authorId });
                });
            } else {
                Profiles.showUserProfile({ userId: authorId });
            }
        }
    };

    for (const author of plugin.manifest.authors) {
        children.push(
            <Text variant="text-md/semibold" color="text-muted" onPress={() => handlePress(author.id)}>{author.name}</Text>
        );
        children.push(", ");
    }

    children.pop();

    return (
        <Text variant="text-md/semibold" color="text-muted">
            {children}
        </Text>
    );
}
function Title() {
    const styles = usePluginCardStyles();
    const plugin = usePlugin();

    const iconName = plugin.manifest.vendetta?.icon;
    const icon = iconName && findAssetId(iconName);

    const textElement = (
        <Text
            numberOfLines={1}
            variant="heading-lg/semibold"
        >
            {plugin.manifest.name}
        </Text>
    );

    return !icon ? textElement : <View
        style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6
        }}
    >
        <Image
            style={styles.smallIcon}
            source={icon}
        />
        {textElement}
    </View>;
}

// TODO: Wrap in a Card-ish component with red bg
// TODO: Allow glacing at the error's stack
// function Status() {
//     const plugin = usePlugin();
//     const styles = usePluginCardStyles();
//     const INTERACTIVE_NORMAL = useToken(tokens.colors.INTERACTIVE_NORMAL);

//     if (!plugin.error) return null;

//     return <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
//         <View style={styles.smallIcon}>
//             <Image
//                 tintColor={INTERACTIVE_NORMAL}
//                 source={findAssetId("WarningIcon")}
//             />
//         </View>
//         <Text variant="text-sm/semibold">
//             There was an error while attempting to start this plugin.
//         </Text>
//     </View>;
// }

const Actions = memo(() => {
    const plugin = usePlugin();
    const navigation = NavigationNative.useNavigation();

    return <View style={{ flexDirection: "row", gap: 6 }}>
        <IconButton
            size="sm"
            variant="secondary"
            icon={findAssetId("WrenchIcon")}
            disabled={!VdPluginManager.getSettings(plugin.id)}
            onPress={() => navigation.push("VendettaCustomPage", {
                title: plugin.manifest.name,
                render: VdPluginManager.getSettings(plugin.id),
            })}
        />
        <IconButton
            size="sm"
            variant="secondary"
            icon={findAssetId("CircleInformationIcon-primary")}
            onPress={() => void showSheet(
                "PluginInfoActionSheet",
                import("./sheets/PluginInfoActionSheet"),
                { plugin, navigation }
            )}
        />
    </View>;
});

export default function PluginCard({ item: plugin }: CardWrapper<VendettaPlugin>) {
    useProxy(plugin);

    return (
        <PluginContext.Provider value={plugin}>
            <Card>
                <Stack spacing={16}>
                    {/* <Status /> */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <View style={{ flexShrink: 1 }}>
                            <Title />
                            <Authors />
                        </View>
                        <View>
                            <Stack spacing={12} direction="horizontal">
                                <Actions />
                                <TableSwitch
                                    value={plugin.enabled}
                                    onValueChange={(v: boolean) => {
                                        if (v) VdPluginManager.startPlugin(plugin.id);
                                        else VdPluginManager.stopPlugin(plugin.id);
                                    }}
                                />
                            </Stack>
                        </View>
                    </View>
                    <Text variant="text-md/medium">
                        {plugin.manifest.description}
                    </Text>
                </Stack>
            </Card>
        </PluginContext.Provider>
    );
}
