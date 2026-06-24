import { CalendarIcon, PlusIcon, PencilIcon, TrashIcon, TrophyIcon } from '@heroicons/react/24/outline';
import type { UpcomingTournament } from '../../../../types/chess';

interface TournamentForm {
  name: string;
  club: string;
  province: string;
  chessResultsLink: string;
  startDate: string;
  endDate: string;
}

interface UpcomingTournamentsSectionProps {
  upcomingTournaments: UpcomingTournament[];
  isAddingTournament: boolean;
  setIsAddingTournament: React.Dispatch<React.SetStateAction<boolean>>;
  editingTournamentId?: number | null;
  tournamentForm: TournamentForm;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAddTournament: () => void;
  handleUpdateTournament: () => void;
  handleEditTournament: (tournament: UpcomingTournament) => void;
  handleDeleteTournament: (id: number) => void;
  resetForm: () => void;
}

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const UpcomingTournamentsSection = ({
  upcomingTournaments,
  isAddingTournament,
  setIsAddingTournament,
  editingTournamentId,
  tournamentForm,
  handleInputChange,
  handleAddTournament,
  handleUpdateTournament,
  handleEditTournament,
  handleDeleteTournament,
  resetForm
}: UpcomingTournamentsSectionProps) => {
  return (
    <div className="relative overflow-hidden bg-white rounded-2xl shadow-xl border border-slate-200">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
      <div className="p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <CalendarIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-3xl font-bold text-gray-900">Upcoming Tournaments</h2>
              <p className="text-sm sm:text-base text-gray-600">Keep track of your scheduled competitions</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddingTournament(true)}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 w-full sm:w-auto"
          >
            <PlusIcon className="w-5 h-5" />
            Add Tournament
          </button>
        </div>

        {/* Add/Edit Tournament Form */}
        {isAddingTournament && (
          <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl border-2 border-blue-200 dark:border-blue-700/50">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingTournamentId ? 'Edit Tournament' : 'Add New Tournament'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tournament Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={tournamentForm.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Provincial Championship 2024"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Club
                </label>
                <input
                  type="text"
                  name="club"
                  value={tournamentForm.club}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Capital Chess Club"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Province
                </label>
                <input
                  type="text"
                  name="province"
                  value={tournamentForm.province}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Buenos Aires"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Chess-Results Link
                </label>
                <input
                  type="url"
                  name="chessResultsLink"
                  value={tournamentForm.chessResultsLink}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://chess-results.com/..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={tournamentForm.startDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={tournamentForm.endDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={editingTournamentId ? handleUpdateTournament : handleAddTournament}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                {editingTournamentId ? 'Update Tournament' : 'Add Tournament'}
              </button>
              <button
                onClick={resetForm}
                className="px-6 py-2.5 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Upcoming Tournaments List */}
        {upcomingTournaments.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No upcoming tournaments scheduled</p>
            <p className="text-gray-400 text-sm mt-2">Click "Add Tournament" to schedule your next competition</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {upcomingTournaments.map(tournament => (
              <div
                key={tournament.id}
                className="p-5 bg-gradient-to-r from-white to-blue-50 dark:from-slate-800 dark:to-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-700/50 hover:shadow-lg transition-shadow duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{tournament.name}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {tournament.club && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <TrophyIcon className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">Club:</span>
                          <span>{tournament.club}</span>
                        </div>
                      )}
                      {tournament.province && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                          </svg>
                          <span className="font-medium">Province:</span>
                          <span>{tournament.province}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-700">
                        <CalendarIcon className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">Dates:</span>
                        <span>
                          {formatDate(tournament.startDate)}
                          {tournament.endDate && tournament.endDate !== tournament.startDate && ` - ${formatDate(tournament.endDate)}`}
                        </span>
                      </div>
                      {tournament.chessResultsLink && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <a
                            href={tournament.chessResultsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 hover:underline"
                          >
                            View on Chess-Results
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEditTournament(tournament)}
                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                      title="Edit tournament"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTournament(tournament.id)}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title="Delete tournament"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingTournamentsSection;
