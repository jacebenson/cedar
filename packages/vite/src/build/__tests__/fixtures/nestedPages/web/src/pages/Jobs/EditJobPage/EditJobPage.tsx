import EditJobCell from 'src/components/Jobs/EditJobCell'

const EditJobPage = ({ id, token }) => {
  return <EditJobCell id={id} token={token} />
}

export const NonDefaultExport = 'for testing'

export default EditJobPage
