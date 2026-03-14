#pragma once

/**
 * DatabaseWrapper class declaration.
 * Wraps an Itdb_iTunesDB pointer for N-API.
 *
 * Track Handle System:
 * - Tracks are referenced by handles (indices into trackHandles_ vector)
 * - Handles remain valid after save() since pointers don't change
 * - Handles are invalidated when tracks are removed (set to nullptr)
 * - This mirrors how libgpod expects callers to use Itdb_Track* pointers
 */

#include <napi.h>
#include <gpod/itdb.h>
#include <vector>
#include <unordered_map>

class DatabaseWrapper : public Napi::ObjectWrap<DatabaseWrapper> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    static Napi::Object NewInstance(Napi::Env env, Itdb_iTunesDB* db);
    DatabaseWrapper(const Napi::CallbackInfo& info);
    ~DatabaseWrapper();

    // Set the database pointer (called from Parse)
    void SetDatabase(Itdb_iTunesDB* db);

    // Get the database pointer (for use in operation files)
    Itdb_iTunesDB* GetDatabase() const { return db_; }

    // Track handle management (public for use in track_operations.cc etc.)
    uint32_t RegisterTrack(Itdb_Track* track);
    Itdb_Track* GetTrackByHandle(uint32_t handle);
    void InvalidateHandle(uint32_t handle);

private:
    static Napi::FunctionReference constructor;
    Itdb_iTunesDB* db_;

    // Track handle storage
    std::vector<Itdb_Track*> trackHandles_;
    std::unordered_map<Itdb_Track*, uint32_t> pointerToHandle_;

    // Internal helpers
    void PopulateTrackHandles();
    void ClearTrackHandles();

    // Core database methods (database_wrapper.cc)
    Napi::Value GetInfo(const Napi::CallbackInfo& info);
    Napi::Value GetTracks(const Napi::CallbackInfo& info);
    Napi::Value GetPlaylists(const Napi::CallbackInfo& info);
    Napi::Value Write(const Napi::CallbackInfo& info);
    Napi::Value Close(const Napi::CallbackInfo& info);
    Napi::Value GetMountpoint(const Napi::CallbackInfo& info);
    Napi::Value SetMountpoint(const Napi::CallbackInfo& info);
    Napi::Value GetFilename(const Napi::CallbackInfo& info);

    // Track operations (track_operations.cc)
    // Note: All methods accept handle (index) instead of trackId
    Napi::Value GetTrackData(const Napi::CallbackInfo& info);  // Get track object by handle
    Napi::Value GetTrackByDbId(const Napi::CallbackInfo& info);  // Kept for compatibility, returns handle
    Napi::Value AddTrack(const Napi::CallbackInfo& info);  // Returns handle
    Napi::Value RemoveTrack(const Napi::CallbackInfo& info);  // Takes handle
    Napi::Value CopyTrackToDevice(const Napi::CallbackInfo& info);  // Takes handle
    Napi::Value ReplaceTrackFile(const Napi::CallbackInfo& info);  // Takes handle + new file path
    Napi::Value UpdateTrack(const Napi::CallbackInfo& info);  // Takes handle
    Napi::Value GetTrackFilePath(const Napi::CallbackInfo& info);  // Takes handle
    Napi::Value DuplicateTrack(const Napi::CallbackInfo& info);  // Takes handle, returns handle

    // Artwork operations (artwork_operations.cc)
    Napi::Value SetTrackThumbnails(const Napi::CallbackInfo& info);
    Napi::Value SetTrackThumbnailsFromData(const Napi::CallbackInfo& info);
    Napi::Value RemoveTrackThumbnails(const Napi::CallbackInfo& info);
    Napi::Value HasTrackThumbnails(const Napi::CallbackInfo& info);
    Napi::Value GetUniqueArtworkIds(const Napi::CallbackInfo& info);
    Napi::Value GetArtworkFormats(const Napi::CallbackInfo& info);

    // Playlist operations (playlist_operations.cc)
    Napi::Value CreatePlaylist(const Napi::CallbackInfo& info);
    Napi::Value RemovePlaylist(const Napi::CallbackInfo& info);
    Napi::Value GetPlaylistById(const Napi::CallbackInfo& info);
    Napi::Value GetPlaylistByName(const Napi::CallbackInfo& info);
    Napi::Value SetPlaylistName(const Napi::CallbackInfo& info);
    Napi::Value AddTrackToPlaylist(const Napi::CallbackInfo& info);
    Napi::Value RemoveTrackFromPlaylist(const Napi::CallbackInfo& info);
    Napi::Value PlaylistContainsTrack(const Napi::CallbackInfo& info);
    Napi::Value GetPlaylistTracks(const Napi::CallbackInfo& info);

    // Smart playlist operations (playlist_operations.cc)
    Napi::Value CreateSmartPlaylist(const Napi::CallbackInfo& info);
    Napi::Value GetSmartPlaylistRules(const Napi::CallbackInfo& info);
    Napi::Value AddSmartPlaylistRule(const Napi::CallbackInfo& info);
    Napi::Value RemoveSmartPlaylistRule(const Napi::CallbackInfo& info);
    Napi::Value ClearSmartPlaylistRules(const Napi::CallbackInfo& info);
    Napi::Value SetSmartPlaylistPreferences(const Napi::CallbackInfo& info);
    Napi::Value GetSmartPlaylistPreferences(const Napi::CallbackInfo& info);
    Napi::Value EvaluateSmartPlaylist(const Napi::CallbackInfo& info);

    // Chapter data operations (track_operations.cc)
    Napi::Value GetTrackChapters(const Napi::CallbackInfo& info);
    Napi::Value SetTrackChapters(const Napi::CallbackInfo& info);
    Napi::Value AddTrackChapter(const Napi::CallbackInfo& info);
    Napi::Value ClearTrackChapters(const Napi::CallbackInfo& info);

    // Device capability operations (database_wrapper.cc)
    Napi::Value GetDeviceCapabilities(const Napi::CallbackInfo& info);
    Napi::Value GetSysInfo(const Napi::CallbackInfo& info);
    Napi::Value SetSysInfo(const Napi::CallbackInfo& info);
};
