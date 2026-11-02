export function findAssignedDriver(van, drivers) {
  if (!van?.assignedDriver) return null;
  return drivers.find((driver) => String(driver?._id) === String(van.assignedDriver)) ?? null;
}

export function filterVans(vans, drivers, search) {
  const query = search.trim().toLocaleLowerCase();
  if (!query) return vans;

  return vans.filter((van) => {
    const driver = findAssignedDriver(van, drivers);
    return [van.registrationNumber, driver?.name, driver?.email]
      .some((value) => typeof value === 'string' && value.toLocaleLowerCase().includes(query));
  });
}

export function validateVanForm({ registrationNumber, assignedDriver }, drivers) {
  const errors = {};
  const normalizedRegistration = registrationNumber.trim();

  if (!normalizedRegistration) {
    errors.registrationNumber = 'Enter a registration number.';
  } else if (normalizedRegistration.length > 20) {
    errors.registrationNumber = 'Registration number must be 20 characters or fewer.';
  }

  if (!assignedDriver) {
    errors.assignedDriver = 'Select an assigned driver.';
  } else if (!drivers.some((driver) => String(driver._id) === String(assignedDriver))) {
    errors.assignedDriver = 'Select an active driver from the list.';
  }

  return {
    errors,
    payload: {
      registrationNumber: normalizedRegistration.toUpperCase(),
      assignedDriver
    }
  };
}
